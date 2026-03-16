# PROPOSAL PENGEMBANGAN SISTEM: TEMPEST FINANCE PWA

"High-Performance Offline-First Personal Finance Tracker"

## 1. EKSEKUTIF SUMMARY

Tempest Finance adalah aplikasi manajemen keuangan pribadi berbasis Progressive Web App (PWA) yang dirancang untuk mengatasi masalah latensi tinggi pada sinkronisasi cloud tradisional. Dengan arsitektur Local-First, Cloud-Sync, aplikasi ini menjamin kecepatan input instan dengan menggunakan SQLite sebagai buffer sebelum data dikirim secara asynchronous ke Google Sheets sebagai penyimpanan jangka panjang.

## 2. TECH STACK & JUSTIFIKASI

Pemilihan stack ini didasarkan pada efisiensi resource (cocok untuk ThinkPad X260) dan kecepatan pengembangan.

| Komponen | Teknologi | Justifikasi |
|----------|-----------|-------------|
| Framework | Next.js (App Router) | Mendukung Server Components untuk performa dan Route Handlers (REST API) yang efisien tanpa beban tRPC. |
| Styling | Tailwind CSS + Shadcn UI | Menghasilkan UI yang profesional, ringan, dan mobile-responsive dengan waktu pengembangan minimal. |
| Database | SQLite + Prisma ORM | SQLite: File-based, nol konfigurasi, sangat cepat. Prisma: Memastikan tipe data aman (Type-safe) dan migrasi database yang mudah. |
| Cloud Storage | Google Sheets API | Sebagai database sekunder untuk visualisasi data jangka panjang dan kemudahan akses laporan secara kolaboratif. |
| PWA Engine | Serwist (Next-PWA) | Memungkinkan instalasi di HP, caching offline, dan dukungan notifikasi native. |
| Notification | Sonner | Library toast yang sangat ringan untuk memberikan feedback instan kepada pengguna. |

## 3. ARSITEKTUR DATABASE (PRISMA SCHEMA)

Database dirancang untuk mendukung fitur multi-account (Bank/E-wallet) dan mekanisme sinkronisasi.

```prisma
// schema.prisma

model Account {
  id           String        @id @default(cuid())
  name         String        // Contoh: "BCA", "Gopay", "Cash"
  balance      Float         @default(0)
  transactions Transaction[]
}

model Category {
  id           String        @id @default(cuid())
  name         String        // Contoh: "Makanan", "Transportasi"
  type         String        // "EXPENSE" atau "INCOME"
  transactions Transaction[]
}

model Transaction {
  id           String   @id @default(cuid())
  amount       Float
  description  String?
  date         DateTime @default(now())

  // Relations
  accountId    String
  account      Account  @relation(fields: [accountId], references: [id])
  categoryId   String
  category     Category @relation(fields: [categoryId], references: [id])

  // Sync Mechanism Flags
  isSynced     Boolean  @default(false) // Menandai apakah sudah masuk Google Sheets
  createdAt    DateTime @default(now())
}
```

## 4. STRATEGI SINKRONISASI (HYBRID BACKGROUND SYNC)

Ini adalah jantung dari aplikasi Tempest. Strategi ini memisahkan antara Data Persistence (Keamanan data) dan Data Distribution (Google Sheets).

### A. Alur Kerja "Instant-Save"

- **Trigger**: Pengguna menekan tombol "Simpan".
- **Local Commit**: Frontend mengirim data ke API Route Next.js. Data langsung disimpan ke SQLite.
- **Optimistic Feedback**: Server mengirim respon 200 OK dalam hitungan milidetik. UI langsung menampilkan Toast Sukses.
- **Background Process**: Server mengecek variabel autoSync. Jika TRUE, server menjalankan fungsi uploadToSheets() tanpa menggunakan await (berjalan di background).

### B. Logika Offline & Manual Mode

Aplikasi akan memantau status jaringan menggunakan API Browser.

- **Status Offline**: Tombol "Sync" akan muncul secara otomatis atau indikator "Pending Sync" akan aktif.
- **Manual Toggle**: Jika pengguna mematikan Auto-Sync, data akan tetap tersimpan di SQLite dengan flag isSynced: false. Sinkronisasi hanya terjadi saat pengguna menekan tombol "Sync Now".

## 5. RENCANA IMPLEMENTASI (ROADMAP)

### Fase 1: Fondasi & Core DB (Minggu 1)
- Setup Next.js dan konfigurasi Prisma dengan SQLite.
- Pembuatan skema database untuk Akun, Kategori, dan Transaksi.
- Setup integrasi awal Google Sheets API (Service Account).

### Fase 2: UI & Input Instan (Minggu 2)
- Pengembangan dashboard minimalis.
- Pembuatan form input cepat dengan validasi Tailwind.
- Implementasi Sonner Toast untuk feedback instan.

### Fase 3: Engine Sinkronisasi (Minggu 3)
- Pengembangan fungsi background worker untuk upload data ke Google Sheets.
- Implementasi logika isSynced dan penanganan error jika upload gagal (Retry mechanism).
- Pembuatan fitur Toggle Auto/Manual Sync.

### Fase 4: PWA & Optimasi (Minggu 4)
- Konfigurasi Manifest PWA agar bisa diinstal di Android/iOS.
- Audit performa (Lighthouse score) untuk memastikan aplikasi "Super Cepat".
- Testing skenario offline total.

## 6. ANALISIS RISIKO & SOLUSI

### Risiko: Token Google Sheets API kadaluwarsa atau limit harian tercapai.
**Solusi**: Karena kita menggunakan SQLite sebagai primary DB, aplikasi tetap berfungsi normal. Data akan "mengantri" di SQLite dan akan disinkronkan otomatis saat sistem kembali normal.

### Risiko: Konflik data saat input dari dua perangkat berbeda.
**Solusi**: Penggunaan CUID sebagai Primary Key unik di SQLite menjamin tidak ada ID yang bertabrakan saat data digabungkan di Google Sheets.