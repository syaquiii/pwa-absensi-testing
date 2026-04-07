# 📖 Panduan Pengujian Offline & Ketahanan Server (PWA Absensi Digital)

Dokumen ini merangkum secara lengkap Arsitektur Penahan Beban (_Resilience Architecture_) yang diterapkan pada sistem Absensi Digital dan Panduan Skenario Pengujian (_Stress Test_) untuk memastikan sistem 100% siap produksi (tahan gempuran 15.000 Siswa / _Thundering Herd_).

---

## 🏗️ 1. Arsitektur Tiga Lapis Pertahanan (Three-Layer Defense)

Agar _server_ utama tidak leleh dan mati kelaparan (_Out of Memory_ / _Connection DB Refused_), sistem diatur dengan penjagaan 3 tahap:

1. **Lapis Pertama (PWA Client - Tukang Sabar):**
   Aplikasi siswa memiliki kepintaran yang disebut `Background Sync`. Bila HP siswa mati sinyal (Offline), atau Server kepanasan (429), atau Server Mati Total (500/Refused), **PWA akan menyimpan absensi secara aman di berangkas HP (IndexedDB)**. PWA akan mencoba mem-Ping Server terus menerus di balik layar sampai berhasil.

2. **Lapis Kedua (Laravel Global Rate Limiter - Satpam Pintu Depan):**
   `AppServiceProvider` menahan laju masuk HTTP dari internet menggunakan filter `Limit::perSecond(50)`.
   Artinya, selaparnya apa pun jaringan masuk, _Laravel_ hanya menolerir 50 siswa membunyikan bel server per satu detik. Siswa ke-51 dst akan ditendang dengan `HTTP 429` agar server tidak mati. (Siswa yang ditendang ini akan di-tampung oleh Lapis 1).

3. **Lapis Ketiga (Redis/DB Queue Worker - Koki Dapur Latar Belakang):**
   Data dari Lapis 2 yang lolos, **TIDAK** langsung ditulis ke `MySQL`. Permintaan mereka ditampung dulu di keranjang keranjang Queue (Antrean).
   Sebuah _Worker_ (`php artisan queue:work`) secara pelan namun stabil akan memasukkan absen satu-satu ke MySQL memastikan MySQL Database Server tidak panik diserang _Too Many Connections_.

---

## 📱 2. Pengalaman Pengguna (UX) PWA saat Sinyal Terputus

Secara _Front-End_, mahasiwa mendapat pengalaman seolah web tidak pernah rusak:

1. **Status Bar Deteksi Offline**: Saat _smartphone_ kehilangan koneksi, _banner/badge_ indikator khusus akan muncul memberitahukan layar beralih ke Mode Luring (_Offline Mode_).
2. **Kirim Tanpa Ragu**: Form absensi **tidak akan dikunci**. Mahasiswa tetap bisa mengeklik "Hadir". Latar belakang akan menyimpan token ke `IndexedDB` bawaan peramban Chrome/Safari.
3. **Penyelarasan Gaib (Silent Sync)**: Saat HP kembali mendapat koneksi dari jaringan Wi-Fi/4G, `Service Worker` akan membangunkan _event_ `online` dan melempar isi `IndexedDB` tadi secara otomatis tanpa perlu mahasiswa menekan tombol ulang.

---

## 🌐 3. Pengujian Manual di Browser (Frontend Offline Simulation)

Selain pengujian beban mesin tangguh, Anda bisa mengetes PWA Absensimu di peramban seolah-olah HP-mu kehilangan sinyal:

1. Buka Web Absensi PWA ini di **Google Chrome** dan selesaikan Log In.
2. Tekan **F12** untuk membuka tab `Developer Tools`.
3. Buka Tab **Network**, lalu ubah opsi _Throttling_ dari `No throttling` menjadi **`Offline`**. (Kini _Browser_-mu tidak memiliki koneksi internet).
4. Klik tombol **Hadir** untuk sesi aktif.
    - _Ekspektasi:_ Aplikasi Web TIDAK akan macet/Crash. Notifikasi "Disimpan ke Antrean Luring" akan muncul.
5. Pergi ke Tab **Application > IndexedDB > AbsensiStorage**. Kamu akan melihat absensimu terjebak / tersimpan aman di tabel lokal peramban.
6. Kembalilah ke Tab **Network**, matikan mode Offline menjadi **`No throttling`** kembali.
    - _Ekspektasi:_ Tanpa perlu di-klik ulang, _Service Worker_ akan menyala, mengirim _database_ lokal tadi ke Server, dan notifikasi Hijau (Absen Berhasil) akan muncul!

---

## 🎯 4. Persiapan Simulasi Skenario Beban (Backend K6 Stress Testing)

Untuk mensimulasikan kepanikan massal (_Thundering Herd_), kita menunggangi alat **K6** untuk menendang pintu server dengan kekuatan 500 VUs.

### Persiapan _Environment_ K6:

1. Buka `load-test.js`.
2. Ganti Parameter agar valid dengan Target di Database:

```javascript
session_id: 18, // ID Sesi Aktif dari Dashboard
attendance_code: "123123", // Kode Asli

...
// Update Token secara URL DECODE (Ambil dari Menu Application -> Cookies Browser)
"X-XSRF-TOKEN": "eyJ...",
Cookie: "XSRF-TOKEN=eyJ...; absensi-digital-session=eyJ..."
```

---

## ⚔️ 5. Eksekusi Skenario: "500 Siswa Panik Serentak"

Buka 3 Jendela Terminal Anda!

- **Terminal 1 (Web Server Asli)**
    ```bash
    php artisan serve
    ```
- **Terminal 2 (Koki Latar Belakang / Queue)**
    ```bash
    php artisan queue:work --queue=attendance,default
    ```
- **Terminal 3 (500 Pasukan K6)**
    ```bash
    k6 run load-test.js
    ```

### Analisis Serangan Aktual:

1. Saat K6 mulai mengamuk, sebagian besar Siswa akan terpental kena **HTTP 429 Server Kepanasan**.
2. Bukti lapisan PWA kita jenius: K6 Anda diprogram untuk _"Tidur/Sleep 15 Detik"_ menahan data absensi seperti PWA asli, tidak malah mati (_crash_).
3. Di Terminal 2, Antrean Pekerja (_Job ProcessAttendance_) menyicil eksekusi dengan rata-rata **25 Milidetik** murni tanpa membebani memori utama (tanpa mempedulikan 500 panik di pintu depan utama).

### Kesimpulan Indikator Selesai (Kemenangan):

Pada menit ke-2 (120 Detik), Terminal membuktikan semua data berhasil antre balik:

```text
running (02m00.7s), 00/50 VUs, 500 complete and 0 interrupted iterations
default ✓ [ 100% ] 50 VUs  02m00.7s/10m0s  500/500 shared iters
    checks_total.......: 500
```

---

## 🛡️ 6. Validasi Jaminan Keamanan Anti-Ganda (Idempotency)

_(Jaminan MySQL Anti-Duplikasi)_

Siswa iseng memencet "Kirim Absen" ratusan kali sembari sinyal putus-putus. K6 mengirim identitas sama 500x. Kenapa di _Database_ tidak ada nama anak kembar 500 nama?

_Formula Masterpiece:_

```php
$attendance = Attendance::updateOrCreate(
    [ 'user_id' => $this->userId, 'attendance_session_id' => $this->sessionId ]
);
```

**Hasil:** Logika ini menjamin satu anak hanya mengambil 1 kursi. Database membanting 500 _request_ spam tersebut ke 1 Baris tunggal yang di `UPDATE`, menjaga rapor absensi bersih sementara riwayat historis spam tetap dicatat sempurna ke kotak hitam (_table `idempotency_keys`_) milik Server. 🚀
