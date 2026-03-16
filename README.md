# 🌩️ Tempest Finance PWA

> **High-Performance Offline-First Personal Finance Tracker**

Tempest Finance adalah aplikasi manajemen keuangan pribadi modern yang dirancang untuk kecepatan input instan dan ketahanan offline. Dibangun menggunakan teknologi teratas untuk memberikan pengalaman pengguna yang mulus (smooth) seperti aplikasi native.

---

## ✨ Fitur Utama

- 🔒 **Autentikasi Aman**: Masuk menggunakan sistem PIN 6-Digit yang cepat dan aman.
- 🏦 **Manajemen Multi-Akun**: Kelola saldo di berbagai dompet (Bank, E-Wallet, Dompet Tunai) secara terpusat.
- 👻 **Uang Goib (Defisit Tracker)**: Fitur pintar pencatatan saldo minus/bon agar sistem tidak crash. Otomatis "dibayar" saat ada pemasukan!
- 🏷️ **Kategori Dinamis**: Kelola kategori Pendapatan (Income) dan Pengeluaran (Expense) dengan visualisasi ikon/warna.
- ⚡ **Instant-Save Core**: Menulis transaksi dalam hitungan milidetik. Tidak ada loading yang menghambat input keuangan Anda.
- 🔄 **Transfer Atomik**: Pindahkan dana antar akun dengan dukungan pencatatan biaya admin dalam satu transaksi aman.
- 📱 **Progressive Web App (PWA)**: Dapat diinstal di Android/iOS, mendukung caching offline untuk akses tanpa hambatan kapan saja.

---

## 🛠️ Tech Stack

Aplikasi ini menggunakan teknologi modern dengan efisiensi performa tinggi:

| Komponen | Teknologi |
| :--- | :--- |
| **Framework** | [Next.js](https://nextjs.org/) (App Router) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [Shadcn UI](https://ui.shadcn.com/) |
| **Database ORM** | [Prisma](https://www.prisma.io/) |
| **Database** | PostgreSQL |
| **PWA Engine** | [Serwist](https://serwist.pages.dev/) |
| **Notification** | [Sonner](https://sonner.stevenly.me/) |

---

## 🚀 Memulai (Local Setup)

### 1. Prasyarat
Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (rekomendasi) atau `npm`

### 2. Kloning & Install
```bash
# Install dependensi
pnpm install
```

### 3. Konfigurasi Environment
Buat file **`.env`** di root directory dan sesuaikan konfigurasinya:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/finance_db"
# Tambahkan variable lain jika diperlukan (misal: Google Sheets API Creds jika aktif)
```

### 4. Database Setup
Sinkronkan schema database Anda:
```bash
npx prisma db push
# Atau jika menggunakan migrasi:
# npx prisma migrate dev --name init
```

### 5. Jalankan Aplikasi
```bash
pnpm dev
```
Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 📱 PWA Support
Aplikasi ini sudah mendukung PWA. Di browser Google Chrome / Safari, Anda akan melihat tombol **"Install"** untuk memasang aplikasi ini langsung di layar utama (Desktop/Mobile) layaknya aplikasi PlayStore/AppStore.
