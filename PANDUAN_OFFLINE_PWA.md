# Panduan Arsitektur Absensi PWA (Offline-First)

Sistem Absensi Digital ini dirancang menggunakan prinsip yang sangat cerdas: **Offline-First**. Artinya, kegiatan absen siswa-siswi di lapangan tidak akan terganggu meskipun koneksi internet instansi sedang sangat buruk atau bahkan ketika *server* utama mengalami "mati mendadak".

## 🌟 Fitur Inti Arsitektur Offline

1. **Event-Driven Detection (Beban Server Ringan)**
   Sistem tidak menggunakan cara konvensional seperti melakukan *"Ping"* secara membabi buta ke server setiap 10 detik. Sebaliknya, aplikasi hanya membaca dari kejadian alami (*Event-Driven*). Fitur Offline akan langsung mengambil alih kendali (UI Offline Mode aktif) jika, dan hanya jika, request absensi siswa ke server mengalami kegagalan akses koneksi (*Timeout* atau jaringan *Drop*). Hal ini membuat RAM server aman dari serangan "Spam Ping" ratusan perangkat secara bersamaan.

2. **Validasi Offline Kriptografi Canggih (SHA-256)**
   Meskipun tidak bisa bicara dengan server/database, bagaimana HP siswa tahu kalau kodenya benar? Data sandi absen (*schedules*) yang di-download saat HP masih terkoneksi disembunyikan menggunakan sandi peretasan **SHA-256**. Ketika diketik oleh Siswa, HP dapat membandingkan keabsahan kode secara independen dan anti-jebol.

3. **Brankas IndexedDB & Background Service Worker Sync**
   Jika Siswa berhasil melakukan absen saat Wifi sekolah mati, rekaman absen tersebut takkan lari ke manapun, melainkan dienkripsi ke *Memori Permanen Ponsel (IndexedDB)* siswa yang bersangkutan. Sehabis server hidup lagi dan HP kembali mendeteksi adanya internet stabil, *Service Worker* otomatis mengeksekusi semua absen yang nyala langsung ke gerbang *Backend*.

---

## 💥 Simulasi Pemecahan Masalah Dua Kerusakan (Troubleshooting Bencana)

Arsitektur aplikasi kita terpecah atas dua modul utama: `Web API Server` (Sang Penerima Tamu / Kasir) dan `Queue Worker` (Sang Eksekutor Dapur). Masing-masing dapat saja tumbang dengan efek yang unik!

### Kasus 1: API Web Server Tumbang (Kasir Hilang / Lampu Padam)
- **Apa yang Muncul:** PWA akan berubah wujud memunculkan peringatan bar merah menyala **Offline Mode**.
- **Di Balik Layar:** Aplikasi tetap menyetujui *Submit* absen siswa. Bedanya, hasil absen diam-diam disimpan pada Memori Lokal perangkat Browser (*IndexedDB*). Histori kehadiran menampilkan: `⏳ Menunggu sinkronisasi...` (Siswa dapat pulang tanpa khawatir).
- **Pemulihan Akhir:** Tatkala internet membaik dan Lampu API Web Server nyala kembali, status bar di atas PWA berubah biru berputar-putar mensinkronisasikan antreannya, lalu histori menjadi tanda `✓ Hadir` cerah secara massal.

### Kasus 2: Pekerja Database *Crash* OOM (Koki Pingsan, Kasir Selamat)
- **Apa yang Muncul:** Layar Aplikasi merasa segar dan stabil mengira jaringannya sempurna ("Online").
- **Di Balik Layar:** HP siswa dengan pedenya membidik tembakan Absen dan memperoleh status sukses di tangan server API (HTTP `202 Accepted`). PWA Siswa memaklumi data absennya diterima pusat dan membuang datanya dari Backup memory. Nahas, data tersebut memupuk menjadi tumpukan sampah panjang di Kolom Database `jobs` Laravel karena Mesin Koki nya mati. PWA HP Siswa tidak bisa menerima sinyal Kehadiran Valid (Karena datanya terjebak tak masuk rapor absensi), lantas logo abu abu pun mandek selamanya `⏳ Menunggu sinkronisasi...`. 
- **⚠️ Penekanan Khusus Admin:** Jika situasi ini melanda, jangan bodoh dengan memaksa **anak-anak untuk absen input yang kedua kalinya!** (App-pun akan tetap memblokir input ganda). Solusinya cuma satu: **Segerakan *Turn-On* Queue**.
  Jalankan perintah pengolah ini di Server Linux mu:
  ```bash
  php artisan queue:work --queue=attendance,default
  ```
  Dan dalam sesaat, ribuan timbunan queue tereksekusi *BOOOM*, berubah status menunjukan `✓ Hadir` di seluruh penjuru perangkat siswa!

---

## 🧪 Testing QA DevTools Checklist 

Untuk Tim IT yang sedang menjalankan pengetesan QA fungsionalitas mematikan jaringan di komputer pribadi (*Localhost*), hal *Chrome DevTools* menyimpan jebakan yang mematikan kapabilitas Luring PWA kita ini.

> **Peringatan KERAS Caching Chrome!**
> HARAM hukumnya bagi kamu menekan `Ctrl + F5` (Hard Refresh) dikala PWA berada Online / Offline. Hard refresh sama saja membunuh detektor ServiceWorker kita karena Chrome mem*bypassnya* sepihak, memanggil Data API usang nan kadaluwarsa ketika internet di cabut!

Lakukan Step Standar Testing Pengujian berikut ini: 

### 1. Persiapan Basis Lokal
*Buka terminal berbarengan:*
```bash
  php artisan serve
```
*Gunakan Tab ke dua:*
```bash
  php artisan queue:work --queue=attendance,default
```
Pastikan di Panel Portal *Admin* setidaknya telah disediakan 1 session aktif.

### 2. Loading Memori *Offline* Luring
Buka mode penyamaran *Incognito*, akses PWA murid di `http://localhost:8000/student/attendance`. Agar `ServiceWorker` menangkap muatan terbaru memori cache dari API, lakukan **Satu Kali Refresh Normal (F5 saja)**. Tampilan antarmuka masukan pin akan muncul bersih.

### 3. Simulasi Offline Memutus Kabel
Buka *Inspect Element (F12)*, buka Panel Tab **Network**, kemudian gulir *Dropdown* 'No throttling' kepada wujud **'Offline'**. Boleh direfresh Normal lagi untuk melihat wujud Merahnya muncul, atau tanpa direfresh pun, Aplikasi akan sadar koneksi ini Drop dan menghitam!
Inputkan sembarang *Pin* absensinya *(misal: HJKLNM)*. Tombol berputar ria menghasilkan wujud `⏳ Menunggu Sinkronisasi`. Buktikan kehebatan itu di sini, memori Indexer telah membungkus isian tersebut.

### 4. Tahap Pemulihan
Kembalikan setelan DevTools Network Network kepada `No throttling`, kemudian angkat tangan dan **LEPASKANMOUSE! JANGAN PERNAH MENYENTUH ATAU MEREFRESH SCREEN!**
Background engine dari Browser mengidentifikasi kebangkitan jaringan, secara rahasia mengeksekusikan beban yang menanti di brankasnya menuju ke *Backend PHP Laravel*, disambar gesit oleh *Queen Worker* database, dan teks Status di layar akan *Magis* berkedip serentak mengganti statusnya dengan balok Hijau mencolok: **"Semua Selesai: ✓ Hadir!"** 
