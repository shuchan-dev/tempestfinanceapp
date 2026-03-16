# PLAN FASE 4: PWA (Progressive Web App)

Sesuai permintaan Anda, kita "melompati" Fase 3 sementara waktu dan langsung menuju Fase 4. Fase ini berfokus pada mengubah aplikasi web Next.js kita menjadi Progressive Web App (PWA) sungguhan sehingga dapat diinstal layaknya aplikasi native di HP Android, iOS, maupun Desktop, serta memiliki kemampuan *caching* dasar.

## 1. Setup PWA dengan "@serwist/next"
Kita akan menggunakan **Serwist** (`@serwist/next` dan `serwist`), karena ini adalah standar modern dan paling direkomendasikan untuk Next.js App Router saat ini (menggantikan library lama seperti `next-pwa` yang sudah macet pengembangannya).

**Langkah-langkah:**
1. Install package: `pnpm add @serwist/next serwist`
2. Konfigurasi `next.config.ts` — Membungkus file config dengan `withSerwist` untuk otomatis inject service worker saat build.
3. Buat file `src/app/sw.ts` — Titik masuk (entry point) service worker untuk mengatur *precaching* dan *runtime caching*.

## 2. Web App Manifest
Untuk membuat logo "Add to Home Screen" muncul di HP, browser mewajibkan adanya file Manifest.

**Langkah-langkah:**
1. Buat file `src/app/manifest.ts` menggunakan native Metadata API dari Next.js.
2. Isi informasi krusial:
   - `name`: "Tempest Finance"
   - `short_name`: "Tempest"
   - `display`: "standalone" (Menyembunyikan bar URL browser saat dibuka)
   - `theme_color` & `background_color` (Disamakan dengan tema gelap kita)
   - `icons`: Array berisikan ukuran ikon wajib (192x192 & 512x512). *Catatan: Untuk sementara, kita sediakan file ikon *dummy* kotak transparan/logo agar PWA valid.*

## 3. Optimasi Metadata di Layout Utama
Kompatibilitas khusus untuk ekosistem iOS/Apple.

**Langkah-langkah:**
Update `src/app/layout.tsx` untuk menaruh tags spesifik Apple:
- `appleWebApp` (capable, title, statusBarStyle).

## 4. Validasi Akhir
- Mengecek status PWA di Chrome DevTools (Tab Application > Manifest).
- PWA ini nantinya sudah bisa digunakan secara semi-offline karena semua aset web Next.js akan di-cache oleh Serwist! (Sejalan dengan API SQLite kita yang memang berjalan di server lokal saat ini).
