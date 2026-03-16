# PLAN FASE 2 — UI & INPUT INSTAN (FAST ENTRY)
> **Tempest Finance PWA** · Fase 2 dari 4
> Dibuat: 2026-03-14 | Prinsip: Clean Code, DRY, KISS, SoC
> **WAJIB DIBACA sebelum mulai coding fase ini**

---

## Tujuan Fase 2

Membangun fondasi antarmuka pengguna (UI) yang:
1. **Premium & Modern**: Dark mode default, tipografi bersih (Geist font yang sudah ada), animasi mulus.
2. **Mobile-First PWA-style**: Ada bottom navigation yang floating, komponen bottom sheet untuk form.
3. **Instan**: Transaksi harus bisa diinput dalam hitungan detik (Offline-first approach).

---

## Status Eksekusi

| Langkah | Komponen | File Target | Keterangan |
|---------|----------|-------------|------------|
| 1. Design System | `globals.css` | `src/app/globals.css` | ✅ Setup Shadcn color variable & shake animation |
| 2. Layout & Nav | `<BottomNav>` | `src/components/bottom-nav.tsx` | ✅ Navigasi (Dashboard, Riwayat, Settings) |
| 3. Layout & Banner| `<OfflineBanner>` | `src/components/offline-banner.tsx`| ✅ Indikator "offline" merah |
| 4. Update Layout | `RootLayout` | `src/app/layout.tsx` | ✅ Wrap children dengan layout PWA |
| 5. Core Dashboard | `page.tsx` | `src/app/page.tsx` | ✅ Kartu Saldo Utama, Recent Transactions |
| 6. Input Form | `<TransactionForm>`| `src/components/transaction-form.tsx`| ✅ Form transaksi (Drawer/Dialog) + validasi |
| 7. FAB Button | `<AddButton>` | *di dalam page.tsx* | ✅ Floating Action Button (+) di pojok kanan |
| 8. Halaman History| `history/page.tsx` | `src/app/history/page.tsx` | ✅ Daftar panjang semua transaksi |
| 9. Halaman Seeder| `seed/page.tsx` | `src/app/seed/page.tsx` | ✅ Utility isi dummy account & categories |

---

## Detail Teknikal per Komponen

### 1. Design System (`globals.css`)
- **Tema Utama**: Dark mode.
- **Warna**: Aksen untuk `INCOME` (emerald-500), `EXPENSE` (red-500), `TRANSFER` (blue-500).
- **Animasi Custom**:
  ```css
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  .animate-shake { animation: shake 0.3s ease-in-out; }
  ```

### 2. Client-Side Data Fetching (tanpa tRPC)
Karena kita menghindari tRPC untuk mengurangi *overhead*, kita akan menggunakan standar React `useEffect` atau `SWR` (jika diinstall, jika tidak pakai fetch standar dengan React Context/State lokal) untuk *Instant Feedback*.

**Pendekatan "Instant-Save" (Offline First):**
1. User klik "Simpan".
2. UI: Update *state lokal* (tambahkan item ke list dengan ikon ⏳).
3. UI: Munculkan Toast "Tersimpan!".
4. Form: Reset.
5. Background: Panggil `POST /api/transactions`.
6. Jika `POST` gagal (karena offline): Biarkan state lokal, data nanti disync.

### 3. Komponen `<TransactionForm>`
- **Fields**:
  - `Tipe`: Toggle Button Group (Pengeluaran, Pemasukan, Transfer).
  - `Nominal`: Input Number raksasa di tengah (mudah dipencet).
  - `Kategori`: Select/Dropdown (diambil dari `/api/categories`).
  - `Akun`: Select (diambil dari `/api/accounts`).
  - `Catatan`: Input text opsional.
- **Validasi**: Jika Nominal kosong, tambah class `animate-shake` dan outline merah.

### 4. Layout & Bottom Nav
- Aplikasi harus terasa seperti *native app*.
- `body` harus punya `pb-24` agar konten tidak tertutup bottom nav.
- `<BottomNav>` posisinya `fixed bottom-0 w-full`.

---

## Urutan Eksekusi (Checklist Fase 2)
1. Edit `globals.css` (tambahkan design tokens shadcn dan keyframes).
2. Buat `src/components/offline-banner.tsx` (event listener `navigator.onLine`).
3. Buat `src/components/bottom-nav.tsx` (pakai Lucide icons).
4. Update `src/app/layout.tsx` (tambahkan font, banner, nav).
5. Buat skeleton UI untuk `src/app/page.tsx`.
6. Buat `TransactionForm.tsx`.
7. Testing flow "klik (+) -> muncul form -> error shake -> isi data -> submit -> toast sukses".

---

## Persiapan Transisi
Sebelum mulai ngoding UI ini, pastikan di prompt berikutnya Anda memberi tahu User bahwa:
1. Kita akan butuh Shadcn package (`lucide-react`, `sonner`, `clsx`, dll yang sudah ada di `package.json`, jika tidak ada maka minta install).
2. Proses coding akan difokuskan pada CSS dan React Components.


## Transisi ke Fase 3

Setelah Fase 2 selesai diverifikasi, buat `plan-fase3.md` sebelum memulai coding tahap selanjutnya.