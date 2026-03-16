# ALUR UTAMA: INPUT TRANSAKSI (THE INSTANT-SAVE FLOW)

Alur ini dirancang agar pengguna bisa melakukan input berkali-kali tanpa harus menunggu proses jaringan.

1. **AKSI**: Pengguna membuka PWA dan menekan tombol Floating Action Button (+).
2. **SISTEM**: Menampilkan Form Input (Nominal, Akun, Kategori, Catatan).
3. **AKSI**: Pengguna mengisi data dan menekan tombol "Simpan".

## LOGIKA VALIDASI

- **JIKA Form tidak lengkap (Nominal kosong/0)** → **SISTEM**: Goyangkan input (shake animation) + Tampilkan pesan error merah.
- **JIKA Form valid** → **SISTEM**: Kirim data ke API internal `/api/transaction`.

## LOGIKA DATABASE (SERVER-SIDE)

- **SISTEM**: Menulis data ke SQLite (Prisma) dengan status `isSynced: false`.
- **JIKA Tulis SQLite Gagal** → **SISTEM**: Kirim respon Error 500. UI: Tampilkan Toast "Gagal Simpan ke DB!".
- **JIKA Tulis SQLite Berhasil** → **SISTEM**: Kirim respon Success 200.

## LOGIKA UI (FRONTEND - INSTANT FEEDBACK)

- **SISTEM**: Menerima Success 200.
- **SISTEM**: Menampilkan Toast Sukses ("Tersimpan di Lokal!").
- **SISTEM**: Menghapus isi Form (Reset Form) agar siap input transaksi berikutnya.
- **SISTEM**: Menambahkan baris transaksi baru ke daftar "History" di layar utama dengan ikon Pending (⏳).

# 2. ALUR SINKRONISASI OTOMATIS (BACKGROUND SYNC ENGINE)

Alur ini berjalan secara invisible (di balik layar) setelah Alur Utama di atas memberikan respon sukses.

## LOGIKA PEMICU (TRIGGER)

- **JIKA Toggle "Auto-Sync" = OFF** → **SISTEM**: Selesai. Data tetap di SQLite dengan status `isSynced: false`.
- **JIKA Toggle "Auto-Sync" = ON** → **SISTEM**: Jalankan fungsi `syncToSheets()`.

## LOGIKA KONEKSI JARINGAN

- **JIKA Status Internet = OFFLINE** → **SISTEM**: Hentikan proses. Beri indikator di UI "Menunggu Online untuk Sinkronisasi".
- **JIKA Status Internet = ONLINE** → **SISTEM**: Kirim data ke Google Sheets API.

## LOGIKA HASIL SINKRONISASI

- **JIKA Google Sheets API Sukses** → **SISTEM**: Update baris di SQLite menjadi `isSynced: true`. UI: Ubah ikon jam (⏳) menjadi centang hijau (✅).
- **JIKA Google Sheets API Gagal (Timeout/Limit)** → **SISTEM**: Biarkan `isSynced: false`. Log error tersimpan. UI: Tampilkan badge kecil "Sync Failed" di item tersebut.

# 3. ALUR SINKRONISASI MANUAL & RECOVERY

Digunakan saat pengguna ingin melakukan "bersih-bersih" data yang tertunda atau setelah kembali online.

1. **AKSI**: Pengguna menekan tombol "Sync Now" di halaman Settings atau di Dashboard (jika ada data tertunda).
2. **SISTEM**: Mencari semua data di SQLite yang memiliki `isSynced: false`.

## LOGIKA JUMLAH DATA

- **JIKA Data tertunda = 0** → **SISTEM**: Tampilkan Toast "Semua data sudah sinkron!".
- **JIKA Data tertunda > 0** → **SISTEM**: Menampilkan Loading Spinner "Menyinkronkan [X] data...".

## LOGIKA PROSES BATCH

- **SISTEM**: Mengirim data ke Google Sheets satu per satu (atau dalam satu request batch).
- **JIKA Seluruh proses sukses** → **SISTEM**: Update semua flag `isSynced` di SQLite. UI: Tampilkan Toast "Berhasil Sinkron ke Sheets!".
- **JIKA Sebagian gagal** → **SISTEM**: Update flag yang sukses saja. UI: Tampilkan Toast "Hanya [X] data tersinkron, [Y] gagal".

# 4. ALUR TRANSFER ANTAR AKUN (SPECIAL TRANSACTION)

Karena melibatkan dua akun dan biaya admin, alurnya sedikit lebih kompleks.

1. **AKSI**: Pengguna memilih tipe transaksi "Transfer".
2. **SISTEM**: Menampilkan input: Akun Asal, Akun Tujuan, Nominal Utama, Biaya Admin.

## LOGIKA PERHITUNGAN

- **SISTEM**: Menghitung total pengeluaran akun asal = Nominal Utama + Biaya Admin.
- **SISTEM**: Menghitung total pemasukan akun tujuan = Nominal Utama.
- **AKSI**: Pengguna klik "Simpan".

## LOGIKA DATABASE (TRANSACTIONAL)

- **SISTEM**: Melakukan operasi Transaction di Prisma (Atomic).
  - Kurangi saldo Akun Asal.
  - Tambah saldo Akun Tujuan.
  - Catat di tabel Transaksi sebagai tipe TRANSFER.
- **SISTEM**: Menjalankan Alur Sinkronisasi (Otomatis/Manual) seperti pada poin 2 & 3.

# 5. ALUR DETEKSI OFFLINE (PWA BEHAVIOR)

**SISTEM**: Terus memantau `navigator.onLine`.

## LOGIKA STATUS

- **JIKA Internet Terputus** → **UI**: Tampilkan banner merah di atas layar: "Anda sedang Offline. Input tetap bisa dilakukan, data disimpan di perangkat."
- **JIKA Internet Terhubung Kembali** → **UI**: Ubah banner menjadi hijau: "Anda kembali Online!" (hilang setelah 3 detik).
- **SISTEM**: (Opsional) Jika Toggle Auto-Sync ON, langsung picu Alur Sinkronisasi Manual secara otomatis untuk mengunggah data yang tertunda selama offline.

## RINGKASAN LOGIKA "A ke B ke C"

A: Input User → B: Simpan SQLite (Cepat) → C: UI Responsif (Toast muncul).

**SESUDAH C**: Cek Jaringan & Toggle → D: Kirim ke Google Sheets → E: Update Status Sync di SQLite & UI.
