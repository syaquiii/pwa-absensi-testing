# 📱 Sistem Absensi Digital PWA

Sistem Absensi Mahasiswa modern berbasis **Progressive Web App (PWA)** dengan UI yang estetik dan keandalan tinggi. Proyek ini dibangun menggunakan **Laravel** dan arsitektur _Zero-Downtime_ tingkat perusahaan.

> ⚠️ **Catatan Penting Penguji / Arsitek Jaringan:**
> Dokumentasi Rinci mengenai mekanisme pertahanan _Server_ dari beban _Thundering Herd_ (15.000 klik berbarengan), _Background Synchronization_, dan Uji Beban K6 **telah dipisah ke dokumen khusus.**
> 👉 **[Baca PANDUAN_OFFLINE_PWA.md](PANDUAN_OFFLINE_PWA.md)** untuk pemahaman arsitektur anti-down.

---

## 🌟 Fitur Utama

- **Estetika Ringan & Modern**: Antarmuka _Glassmorphism_ dan animasi mulus.
- **Offline-First PWA**: Mahasiswa tetap bisa menekan "Hadir" walaupun koneksi internet terputus (data disimpan menggunakan `IndexedDB`).
- **Antrean Penuh Perlindungan (_Queuing_)**: Menjaga server MySQL agar tidak kepenuhan koneksi saat ratusan absen masuk di waktu yang sama.
- **Idempotency Keys**: Sistem Anti-Ganda yang memastikan 1 Siswa yang menekan tombol puluhan kali karena panik hanya akan tercatat 1 kali kehadiran.

---

## 🚀 Panduan Instalasi (Installation Guide)

Untuk menjalankan proyek ini di komputer lokal (Windows/Linux/Mac), silakan ikuti langkah-langkah instalasi standar Laravel berikut:

### 1. Kloning Repositori & Instalasi Dependensi

Ambil data dari server VCS dan instal library pembantu PHP _(Composer)_ serta antarmuka Node.js.

```bash
git clone <url-repo-anda>
cd pwa-protoype

composer install
npm install
npm run build
```

### 2. Konfigurasi Environment (.env)

Buka dan gandakan berkas variabel rahasia. Jangan lupa hasilkan Kunci Keamanan Laravel.

```bash
copy .env.example .env
php artisan key:generate
```

**(PENTING):** Pastikan pada berkas `.env` bagian `QUEUE_CONNECTION` diubah ke `database` jika perangkat lokal-mu belum memiliki teknologi penampungan _Redis_:

```env
QUEUE_CONNECTION=database
```

### 3. Migrasi Database Server

Eksekusi struktur tabel MySQL. Ini akan otomatis membentuk tabel `users`, `attendances`, `jobs` (tempat antrean rehat), dan `idempotency_keys` (tempat paspor ganda).

```bash
php artisan migrate:fresh --seed
```

### 4. Menjalankan Mesin Utama & Servis Latar Belakang

Untuk menghidupkan _Web_ dan Penampung Antrean secara bersamaan, **wajib** sediakan 2 Terminal terpisah:

- **Terminal 1 (Aplikasi Web Utama):**
    ```bash
    php artisan serve
    ```
- **Terminal 2 (Pengolah Antrean Absensi):**
    ```bash
    php artisan queue:work --queue=attendance,default
    ```
    _(Tanpa Terminal 2, absensi yang dilakukan siswa akan menggantung mulu dan tidak tercatat di kalender rapor)._

Setelah kedua Terminal berjalan stabil, Aplikasi PWA sudah bisa kamu buka layaknya aplikasi sungguhan melalui `http://localhost:8000`! 🎉

---

### Tautan Bermanfaat

Jika belum, Pelajari cara menguji dan memaksa _server_ menderita menggunakan _Stress Testing Simulator_ yang ada di dalam menu 👉 **[PANDUAN OFFLINE PWA](PANDUAN_OFFLINE_PWA.md)**.
