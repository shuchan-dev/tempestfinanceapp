# 🌩️ Tempest Finance PWA

> **High-Performance Offline-First Personal Finance Tracker**

Tempest Finance adalah aplikasi manajemen keuangan pribadi modern yang dirancang untuk kecepatan input instan dan ketahanan tinggi. Dibangun menggunakan teknologi teratas untuk memberikan pengalaman pengguna yang mulus (*smooth*) layaknya aplikasi *native*, kini dengan dukungan Cloud Database terdistribusi dan isolasi multi-pengguna.

---

## ✨ Fitur Utama

- 🔒 **Sistem Multi-Pengguna (Data Isolation)**: Autentikasi aman berbasis PIN 6-Digit yang memisahkan dan memproteksi data (Akun, Transaksi, Hutang, dll) untuk masing-masing pengguna di dalam satu sistem aplikasi.
- 👛 **Sub-Accounts (Kantong Bank)**: Terinspirasi dari pengelolaan finansial kekinian (seperti Kantong Bank Jago), Anda dapat membagi satu saldo utama rekening bank menjadi beberapa kantong tujuan (misal: "Kantong Jajan", "Kantong Liburan") tanpa memecah kalkulasi total saldo institusi.
- 🤝 **Pencatat Hutang & Piutang (Debts Tracker)**: Lacak daftar hutang dan piutang Anda kepada kerabat lengkap dengan **fitur Realisasi (Angsuran)**. Sistem akan otomatis melunaskan status hutang begitu progres cicilan telah rampung.
- 👻 **Uang Goib (Defisit Tracker)**: Fitur pintar pencatatan saldo minus/bon agar sistem tidak *crash*. Otomatis "dibayar" secara pintar saat ada pemasukan ke rekening!
- 🏷️ **Kategori & Sub-Kategori Dinamis**: Kelola grup Pendapatan (Income) dan Pengeluaran (Expense) secara terpusat (contoh: Kategori "Makanan" dengan *sub-kategori* "Snack" dan "Kopi").
- ⚡ **Instant-Save Core**: Menulis transaksi dalam hitungan milidetik. Tidak ada *loading* yang menghambat input keuangan nyata Anda.
- 🔄 **Transfer Atomik**: Pindahkan dana antar akun (maupun memecah dana ke dalam *Kantong*) dengan dukungan ekstra pencatatan **Biaya Admin**.
- 📱 **Progressive Web App (PWA)**: Dapat diinstal di Android/iOS, mendukung caching aset untuk akses performa tinggi dan stabil.

---

## 🛠️ Tech Stack

Aplikasi ini menggunakan teknologi modern dengan efisiensi performa yang dapat diandalkan:

| Komponen | Teknologi |
| :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router, Turbopack) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + UI Komponen Kustom |
| **Database ORM** | [Prisma](https://www.prisma.io/) |
| **Database** | [SQLite / Turso DB](https://turso.tech/) (libSQL architecture) |
| **PWA Engine** | [Serwist](https://serwist.pages.dev/) |
| **Notification** | [Sonner](https://sonner.stevenly.me/) |
| **State Mgt** | SWR |

---

## 🚀 Memulai (Local Setup)

### 1. Prasyarat
Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (rekomendasi, v9 atau v10, atau npm)

### 2. Kloning & Install
```bash
# Install dependensi menggunakan pnpm
pnpm install
```

### 3. Konfigurasi Environment & Prisma
Aplikasi menggunakan **Turso/LibSQL** sebagai _provider_ (secara lokal _fallback_ ke SQLite `dev.db`).
Buat file **`.env`** di *root directory* (sesuaikan jika menembak ke server cloud):
```env
# Koneksi SQLite Turso Database Lokal 
# (Untuk environment produksi, isi auth token dan koneksi libsql://)
TURSO_DATABASE_URL="file:./dev.db"
TURSO_AUTH_TOKEN=""
```

### 4. Database Setup & Generate Client
Sinkronkan schema database Anda dan *generate* klien Prisma untuk mendukung tipe data *TypeScript*.
```bash
# Menjalankan migrasi database ke SQLite dev.db Anda
pnpm prisma migrate dev

# Mengenerate Prisma Client terbaru
pnpm prisma generate
```

### 5. Jalankan Aplikasi
```bash
pnpm dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk mulai mengelola keuangan secara cerdas.

---

## 📱 Standar PWA
Aplikasi ini sudah mendukung *Service Worker* mutakhir. Di *browser* berbasis Chromium atau Safari iOS, Anda akan mendapati navigasi **"Add to Home Screen"** atau peringatan "Install" untuk memasang antarmuka ini langsung di layar utama selayaknya aplikasi luring (*offline*).
