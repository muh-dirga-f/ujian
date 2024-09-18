# Panduan Menjalankan Sistem Ujian Sekolah

## Instalasi Node.js

1. Kunjungi situs resmi Node.js di [https://nodejs.org/](https://nodejs.org/)
2. Unduh versi LTS (Long Term Support) yang sesuai dengan sistem operasi Anda.
3. Jalankan installer yang telah diunduh dan ikuti petunjuk instalasi.
4. Setelah instalasi selesai, buka Command Prompt (CMD) untuk memverifikasi instalasi dengan menjalankan perintah:
   ```
   node --version
   npm --version
   ```

## Persiapan Proyek

1. Unduh proyek ini dengan mengklik tombol "Code" berwarna hijau di atas, lalu pilih "Download ZIP".
2. Ekstrak file ZIP yang telah diunduh ke lokasi yang diinginkan di komputer Anda.

## Menjalankan Proyek

1. Buka Command Prompt (CMD).
2. Navigasikan ke direktori proyek yang telah diekstrak, contoh:
   ```
   cd C:\Users\YourUsername\Downloads\sistem-ujian-sekolah
   ```
3. Instal dependensi yang diperlukan dengan menjalankan perintah:
   ```
   npm install
   ```
4. Setelah instalasi selesai, jalankan aplikasi dengan perintah:
   ```
   node app.js
   ```
5. Buka browser dan akses `http://localhost:3000` untuk menggunakan aplikasi.

## Informasi Login

Gunakan kredensial berikut untuk masuk ke sistem:

### Admin
- Username: admin
- Password: admin

### Guru
- Username: hamka
- Password: hamka

### Siswa
- Username: 12345
- Password: 12345

Catatan: Pastikan untuk mengganti password default ini setelah login pertama kali untuk keamanan.

## Troubleshooting

Jika Anda mengalami masalah saat menjalankan aplikasi, pastikan:
1. Node.js terinstal dengan benar (verifikasi dengan `node --version`).
2. Anda berada di direktori proyek yang benar saat menjalankan perintah.
3. Semua dependensi terinstal dengan benar (jalankan `npm install` lagi jika ragu).

Jika masalah masih berlanjut, silakan buat issue baru di repositori GitHub ini.
