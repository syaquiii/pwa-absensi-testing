# 📖 Panduan Pengujian Offline & Ketahanan Server (PWA Absensi Digital)

Dokumen ini merangkum secara lengkap Arsitektur Penahan Beban (*Resilience Architecture*) yang diterapkan pada sistem Absensi Digital dan Panduan Skenario Pengujian (*Stress Test*) untuk memastikan sistem 100% siap produksi (tahan gempuran 15.000 Siswa / *Thundering Herd*).

---

## 🏗️ 1. Arsitektur Tiga Lapis Pertahanan (Three-Layer Defense)

Agar *server* utama tidak leleh dan mati kelaparan (*Out of Memory* / *Connection DB Refused*), sistem diatur dengan penjagaan 3 tahap:

1. **Lapis Pertama (PWA Client - Tukang Sabar):**
   Aplikasi siswa memiliki kepintaran yang disebut `Background Sync`. Bila HP siswa mati sinyal (Offline), atau Server kepanasan (429), atau Server Mati Total (500/Refused), **PWA akan menyimpan absensi secara aman di berangkas HP (IndexedDB)**. PWA akan mencoba mem-Ping Server terus menerus di balik layar sampai berhasil.

2. **Lapis Kedua (Laravel Global Rate Limiter - Satpam Pintu Depan):**
   `AppServiceProvider` menahan laju masuk HTTP dari internet menggunakan filter `Limit::perSecond(50)`. 
   Artinya, selaparnya apa pun jaringan masuk, *Laravel* hanya menolerir 50 siswa membunyikan bel server per satu detik. Siswa ke-51 dst akan ditendang dengan `HTTP 429` agar server tidak mati. (Siswa yang ditendang ini akan di-tampung oleh Lapis 1).

3. **Lapis Ketiga (Redis/DB Queue Worker - Koki Dapur Latar Belakang):**
   Data dari Lapis 2 yang lolos, **TIDAK** langsung ditulis ke `MySQL`. Permintaan mereka ditampung dulu di keranjang keranjang Queue (Antrean).
   Sebuah *Worker* (`php artisan queue:work`) secara pelan namun stabil akan memasukkan absen satu-satu ke MySQL memastikan MySQL Database Server tidak panik diserang *Too Many Connections*.

---

## 🎯 2. Persiapan Simulasi Skenario (K6)

Untuk melakukan pengujian beban (*Stress Test*), kita menggunakan aplikasi **K6** untuk membuat *pasukan anak sekolah bohongan*, dan juga mensimulasikan kepintaran "Back-off Delay" dari PWA.

### Persiapan *Environment* (wajib):
Sebelum menembak peluru K6, pastikan:
1. Pastikan Anda sudah masuk *(login)* di UI Browser Web sebagai Siswa.
2. Pastikan ada **Sesi Absen yang Sedang Aktif** yang dibuat oleh Admin (klik tombol "Mulai Absen").
3. Catat `session_id` dari Sesi yang Aktif tersebut (misalnya `id: 18`) dan kodenya (misalnya `"123123"`).
4. Ambil Sandi `XSRF-TOKEN` dan `Cookie Session` dengan menekan **F12** di Google Chrome pada tab **Application > Cookies** atau Copy cURL dari Network Tab.

Lalu edit *script* K6 (`load-test.js`) Anda di bagian ini:
```javascript
// Ganti Parameter agar valid dengan ID di Database!
session_id: 18, 
attendance_code: "123123",

...
// Update Token secara URL DECODE
"X-XSRF-TOKEN": "eyJ...",
Cookie: "XSRF-TOKEN=eyJ...; absensi-digital-session=eyJ..."
```

---

## ⚔️ 3. Eksekusi Skenario: "500 Siswa Panik Serentak"

**Skenarionya:** 500 Siswa berkumpul di Aula, Sinyal Jelek, dan 500 orang menekan "Tombol Absen" persis di satu detik yang sama.

### Langkah-langkah Eksekusi:
Buka 3 Jendela Terminal Anda!

*   **Terminal 1 (Web Server Asli)**
    ```bash
    php artisan serve
    ```
*   **Terminal 2 (Koki Latar Belakang / Queue)**
    ```bash
    php artisan queue:work --queue=attendance,default
    ```
*   **Terminal 3 (500 Pasukan K6)**
    ```bash
    k6 run load-test.js
    ```

### Ekspektasi Alur Kejadian Interaktif:
1. Saat K6 dijalankan, layar Terminal 1 (*Server*) dan Terminal 3 (K6) akan penuh.
2. Di layar K6 **(Terminal 3)**, Anda akan melihat sebagian Siswa sukses ditampung, dan sebagian Siswa langsung dihantam *Error* `🔥 Server Kepanasan (429) -> PWA Aktif Mengantre`.
   Ini membuktikan **Lapis Kedua** menjaga server kita dengan baik. K6 (sebagai PWA Semu) terpaksa "Tidur/Sleep 15 Detik" menunggu antrean reda.
3. Di **Terminal 2**, Anda akan melihat `App\Jobs\ProcessAttendance .... DONE` berjalan mulus dengan kecepatan sekitar **25 milidetik** per-Siswa. Koki dengan tenang memproses satu-persatu antrean yang sudah diizinkan Server masuk. 

### Kesimpulan Indikator Selesai (Kemenangan):
Pada menit ke-2 (120 Detik), simulasi akan menunjukkan:

```text
running (02m00.7s), 00/50 VUs, 500 complete and 0 interrupted iterations
default ✓ [ 100% ] 50 VUs  02m00.7s/10m0s  500/500 shared iters 
    checks_total.......: 500
```
Angka `500 complete` ini artinya seluruh Siswa yang tertendang Rate-Limiter (Kepenuhan) sukses ngantre balik via *Background Sync* K6 tanpa melewatkan satupun absen. 

## 🛡️ 4. Validasi Anti-Double-Absen (Idempotency)

*(Optional check bila diperlukan)*

Bagaimana jika karena Jaringan Lemot, siswa bolak balik menekan "Kirim Absen" sehingga 1 orang terdeteksi seolah 500x mengirim permintaan HTTP?

Di dalam Kerapian *Backend* Laravel pada Pekerja Latar (`ProcessAttendance`), kita menancapkan rumus:
```php
$attendance = Attendance::updateOrCreate(
    [ 'user_id' => $this->userId, 'attendance_session_id' => $this->sessionId ]
);
```
**Efek Super:** Meski K6 menembakkan ID Siswa yang sama sebanyak 500 kali (Karena Cookie menempel *User_ID* yang sama terus), ke-500 tembakan Absen ini ditangkap dan ditimpa di-1 Baris (`Row`) `attendances` yang sama MySQL kita. 

Sedangkan Riwayat bukti mereka merepotkan server (500 HTTP *Request* aslinya) tetap dicatat sebagai resi pembayaran yang valid oleh tabel `idempotency_keys` kita! Server bersih, aman dari duplikat, Siswa Tenang. 🎉
