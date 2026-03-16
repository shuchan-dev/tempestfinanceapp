# PLAN FASE 1 — FONDASI & DATABASE
> **Tempest Finance PWA** · Fase 1 dari 4
> Dibuat: 2026-03-14 | Prinsip: Clean Code, DRY, KISS, SoC
> **WAJIB DIBACA sebelum mulai coding fase ini**

---

## Tujuan Fase 1

Meletakkan pondasi solid: schema database yang benar, Prisma client yang siap dipakai oleh semua lapisan aplikasi, dan type definitions yang menjadi kontrak antar-layer.

---

## Status

| Langkah | Status | Keterangan |
|---------|--------|------------|
| Baca referensi (standartcode, proposal, flow) | ✅ Done | — |
| Survei struktur proyek | ✅ Done | Next.js 16, Prisma, SQLite |
| Buat task.md & implementation_plan.md | ✅ Done | Di artifact dir |
| Buat plan-fase1.md (ini) | ✅ Done | — |
| Update Prisma Schema | ✅ Done | Lihat detail di bawah |
| Setup .env DATABASE_URL | ✅ Done | — |
| prisma migrate dev | ✅ Done | — |
| prisma generate | ✅ Done | — |
| Buat src/lib/db.ts | ✅ Done | Singleton client dg better-sqlite3 |
| Buat src/lib/utils.ts | ✅ Done | Format helpers |
| Buat src/types/index.ts | ✅ Done | Type contracts |

---

## Detail Perubahan

### 1. `prisma/schema.prisma` — UPDATE

Schema yang ada sudah memiliki `Account` dan `Transaction` dasar.
Perlu dilengkapi dengan:

```prisma
model Account {
  id               String        @id @default(cuid())
  name             String        // "BCA", "Gopay", "Cash"
  balance          Float         @default(0)
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
  
  // Relations
  transactions     Transaction[] @relation("AccountTransactions")
  transfersOut     Transaction[] @relation("TransferFrom")
  transfersIn      Transaction[] @relation("TransferTo")
}

model Category {
  id           String        @id @default(cuid())
  name         String        // "Makanan", "Transportasi"
  type         String        // "EXPENSE" | "INCOME"
  icon         String?       // Emoji icon opsional
  transactions Transaction[]
}

model Transaction {
  id            String    @id @default(cuid())
  amount        Float
  type          String    // "INCOME" | "EXPENSE" | "TRANSFER"
  description   String?
  date          DateTime  @default(now())
  createdAt     DateTime  @default(now())

  // Sync Flag
  isSynced      Boolean   @default(false)

  // Relations
  accountId     String
  account       Account   @relation("AccountTransactions", fields: [accountId], references: [id])

  categoryId    String?
  category      Category? @relation(fields: [categoryId], references: [id])

  // Transfer-specific fields
  toAccountId   String?
  toAccount     Account?  @relation("TransferTo", fields: [toAccountId], references: [id])
  adminFee      Float?    @default(0)

  // Backward relation untuk "from" transfer
  fromTransactions Account? @relation("TransferFrom", fields: [accountId], references: [id])
}
```

> **Catatan**: Relasi `TransferFrom` tidak dibutuhkan jika `accountId` sudah mewakili "akun asal". Relasi ini akan disederhanakan di implementasi.

### 2. `.env` — UPDATE

```env
DATABASE_URL="file:./dev.db"
```

### 3. `src/lib/db.ts` — BARU (Singleton Pattern)

```typescript
// Mencegah multiple Prisma Client instances di mode development (hot-reload)
import { PrismaClient } from '../../generated/prisma'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

### 4. `src/lib/utils.ts` — BARU

- `formatCurrency(amount: number): string` — format ke IDR
- `formatDate(date: Date | string): string` — format ke "14 Mar 2026"
- `cn(...classes)` — Tailwind class merger

### 5. `src/types/index.ts` — BARU

Type definitions yang menjadi kontrak API ↔ UI.

---

## Urutan Eksekusi

```
1. Update schema.prisma
2. Set DATABASE_URL di .env
3. npx prisma migrate dev --name "add_category_and_transfer"
4. npx prisma generate
5. Buat src/lib/db.ts
6. Buat src/types/index.ts
7. Buat src/lib/utils.ts
8. Verifikasi: npx prisma studio (cek tabel terbuat)
```

---

## Verifikasi Fase 1 Selesai

- [x] `npx prisma migrate dev` berhasil tanpa error
- [x] `npx prisma generate` berhasil
- [x] `src/lib/db.ts` bisa diimport tanpa error TypeScript
- [x] `src/types/index.ts` mendefinisikan semua type yang dibutuhkan
- [x] `src/lib/utils.ts` memiliki `formatCurrency` yang menghasilkan format IDR

---

## Transisi ke Fase 2

Setelah Fase 1 selesai diverifikasi, buat `plan-fase2.md` sebelum memulai coding UI.
