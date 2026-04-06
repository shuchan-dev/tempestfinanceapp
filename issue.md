# 🛠️ Panduan Fix PR #9 — Step-by-Step

> Panduan ini ditulis agar bisa dijalankan oleh **programmer junior** atau **model AI murah** tanpa perlu memahami arsitektur keseluruhan. Ikuti setiap langkah secara berurutan. Jangan skip.

---

## Prasyarat

- Buka project di `c:\Users\Ryhan\Documents\Project\financeappstempest`
- Pastikan kamu sudah di branch `feature/new-and-fix-bug` (sudah di branch ini)
- Setiap selesai 1 section, commit perubahan dengan pesan yang disediakan

---

## 🔴 FIX 1: Migrasi Auth Pattern di Quick-Adds API

**File:** `src/app/api/quick-adds/route.ts`

### Apa masalahnya?
File ini menggunakan `getUserId()` dari `@/lib/session` secara langsung, padahal semua API route lain sudah menggunakan `resolveUserId()` dari `@/lib/api-utils`. Selain itu, tidak ada `try/catch` di handler manapun.

### Langkah-langkah:

#### 1.1 Ganti import (baris 1-3)

**Sebelum:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
```

**Sesudah:**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
```

#### 1.2 Ganti handler GET (baris 6-22)

**Ganti seluruh fungsi GET dengan:**
```typescript
export async function GET() {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const quickAdds = await db.quickAdd.findMany({
      where: { userId: userId! },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
        account: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ success: true, data: quickAdds });
  } catch (err) {
    console.error("[GET /api/quick-adds] Error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil quick-adds" },
      { status: 500 }
    );
  }
}
```

#### 1.3 Ganti handler POST (baris 24-69)

**Ganti seluruh fungsi POST dengan:**
```typescript
export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body = await req.json();
    const { name, amount, icon, categoryId, accountId } = body;

    if (!name || !amount || !categoryId || !accountId) {
      return NextResponse.json(
        { success: false, error: "Semua field wajib diisi" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal harus lebih dari 0" },
        { status: 400 }
      );
    }

    const count = await db.quickAdd.count({ where: { userId: userId! } });

    const quickAdd = await db.quickAdd.create({
      data: {
        name,
        amount,
        icon: icon || "💸",
        categoryId,
        accountId,
        userId: userId!,
        order: count,
      },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
        account: { select: { id: true, name: true, icon: true } },
      },
    });

    return NextResponse.json({ success: true, data: quickAdd }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/quick-adds] Error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal membuat quick-add" },
      { status: 500 }
    );
  }
}
```

#### 1.4 Ganti handler DELETE (baris 71-94)

**Ganti seluruh fungsi DELETE dengan:**
```typescript
export async function DELETE(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID diperlukan" },
        { status: 400 }
      );
    }

    const existing = await db.quickAdd.findFirst({
      where: { id, userId: userId! },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Quick-add tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.quickAdd.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("[DELETE /api/quick-adds] Error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus quick-add" },
      { status: 500 }
    );
  }
}
```

#### ✅ Verifikasi FIX 1:
- File tidak lagi meng-import `getUserId` dari `@/lib/session`
- Semua 3 handler (GET, POST, DELETE) menggunakan `resolveUserId()`
- Semua 3 handler dibungkus `try/catch` dengan `console.error`

**Commit:** `fix: migrate quick-adds API to resolveUserId and add try/catch`

---

## 🔴 FIX 2: Bulk Delete Harus Mengembalikan Saldo Akun

**File:** `src/app/api/transactions/bulk/route.ts`

### Apa masalahnya?
Saat bulk delete, transaksi hanya di-soft-delete tapi saldo akun **tidak dikembalikan**. Contoh: kalau user bulk-delete 5 transaksi expense, saldo akun tetap terpotong — data keuangan jadi salah.

### Langkah-langkah:

#### 2.1 Ganti seluruh isi file `src/app/api/transactions/bulk/route.ts` dengan:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";

// POST /api/transactions/bulk
// Body: { action: 'delete' | 'recategorize', transactionIds: string[], targetCategoryId?: string }
export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body = await req.json();

    if (
      !body.action ||
      !body.transactionIds ||
      !Array.isArray(body.transactionIds) ||
      body.transactionIds.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Tindakan dan ID transaksi tidak valid" },
        { status: 400 }
      );
    }

    const { action, transactionIds, targetCategoryId } = body;

    // Pastikan semua transaksi milik user aktif (Anti-IDOR)
    const validTransactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: userId!,
        deletedAt: null, // Hanya yang belum dihapus
      },
      select: {
        id: true,
        amount: true,
        type: true,
        accountId: true,
        toAccountId: true,
        adminFee: true,
      },
    });

    if (validTransactions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transaksi tidak ditemukan atau akses ditolak" },
        { status: 404 }
      );
    }

    const validIds = validTransactions.map((tx) => tx.id);

    // ─── ACTION: DELETE ─────────────────────────────────────
    if (action === "delete") {
      // 1. Kembalikan saldo untuk setiap transaksi
      for (const tx of validTransactions) {
        if (tx.type === "EXPENSE") {
          // Expense: saldo tambah kembali
          await db.account.update({
            where: { id: tx.accountId },
            data: { balance: { increment: tx.amount } },
          });
        } else if (tx.type === "INCOME") {
          // Income: saldo kurangi kembali
          await db.account.update({
            where: { id: tx.accountId },
            data: { balance: { decrement: tx.amount } },
          });
        } else if (tx.type === "TRANSFER") {
          // Transfer: kembalikan ke sumber, kurangi dari tujuan
          const fee = tx.adminFee || 0;
          await db.account.update({
            where: { id: tx.accountId },
            data: { balance: { increment: tx.amount + fee } },
          });
          if (tx.toAccountId) {
            await db.account.update({
              where: { id: tx.toAccountId },
              data: { balance: { decrement: tx.amount } },
            });
          }
        }
      }

      // 2. Soft delete semua transaksi
      await db.transaction.updateMany({
        where: { id: { in: validIds } },
        data: { deletedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: `${validIds.length} transaksi dihapus dan saldo dikembalikan`,
      });
    }

    // ─── ACTION: RECATEGORIZE ───────────────────────────────
    if (action === "recategorize") {
      if (!targetCategoryId) {
        return NextResponse.json(
          { success: false, error: "ID Kategori target harus diisi" },
          { status: 400 }
        );
      }

      // Verifikasi kategori milik user
      const category = await db.category.findFirst({
        where: { id: targetCategoryId, userId: userId! },
      });

      if (!category) {
        return NextResponse.json(
          { success: false, error: "Kategori tidak ditemukan" },
          { status: 404 }
        );
      }

      await db.transaction.updateMany({
        where: { id: { in: validIds } },
        data: { categoryId: targetCategoryId },
      });

      return NextResponse.json({
        success: true,
        message: `${validIds.length} transaksi diubah ke kategori "${category.name}"`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Aksi tidak dikenal" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[POST /api/transactions/bulk] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses bulk action" },
      { status: 500 }
    );
  }
}
```

#### ✅ Verifikasi FIX 2:
- Bulk delete sekarang mengembalikan saldo untuk tipe EXPENSE, INCOME, dan TRANSFER
- Recategorize sekarang juga memvalidasi bahwa `targetCategoryId` milik user (Anti-IDOR)
- Hanya transaksi yang belum dihapus (`deletedAt: null`) yang bisa di-bulk-action

**Commit:** `fix: bulk delete now reverses account balances and validates category ownership`

---

## 🟡 FIX 3: Notification Bell — Tampilkan Action Buttons di Mobile

**File:** `src/components/notification-bell.tsx`

### Apa masalahnya?
Tombol "Mark as Read" dan "Delete" hanya muncul saat hover di layar `md+`. Karena ini PWA mobile-first, user HP tidak bisa menandai atau menghapus notifikasi individual.

### Langkah-langkah:

#### 3.1 Cari baris ini (sekitar baris 104):

```tsx
<div className="flex-col items-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 top-3 hidden md:flex">
```

#### 3.2 Ganti dengan:

```tsx
<div className="flex flex-col items-end gap-1 absolute right-4 top-3 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
```

#### ✅ Penjelasan:
- **Sebelum:** `hidden md:flex` → mobile: tersembunyi total, desktop: muncul saat hover
- **Sesudah:** Tombol selalu tampil di mobile, dan hover-fade di desktop

**Commit:** `fix: show notification action buttons on mobile`

---

## 🟡 FIX 4: SVG Gradient ID Collision di Balance Chart

**File:** `src/components/balance-history-chart.tsx`

### Apa masalahnya?
Gradient ID `colorBalance` hardcoded. Jika ada 2+ chart di halaman yang sama, gradient akan konflik.

### Langkah-langkah:

#### 4.1 Cari baris ini (sekitar baris 47):

```tsx
<linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
```

#### 4.2 Ganti dengan:

```tsx
<linearGradient id={`colorBalance-${accountId}`} x1="0" y1="0" x2="0" y2="1">
```

#### 4.3 Cari baris ini (sekitar baris 91):

```tsx
fill="url(#colorBalance)"
```

#### 4.4 Ganti dengan:

```tsx
fill={`url(#colorBalance-${accountId})`}
```

**Commit:** `fix: use unique SVG gradient ID per chart instance`

---

## 🟡 FIX 5: Account History — Gunakan date-fns untuk Date Loop

**File:** `src/app/api/accounts/[id]/history/route.ts`

### Apa masalahnya?
Loop tanggal menggunakan `setDate()` yang memutasi objek Date, dan `toISOString()` yang timezone-sensitive. Bisa menyebabkan tanggal terduplikat atau terlewat.

### Langkah-langkah:

#### 5.1 Tambahkan import di baris paling atas (setelah import yang ada):

```typescript
import { eachDayOfInterval, format } from "date-fns";
```

#### 5.2 Cari blok kode ini (sekitar baris 81-89):

```typescript
    // Bangun timeline dari startDate sampai hari ini
    const history: Array<{ date: string; balance: number }> = [];

    // Hitung mundur: kurangi changes dari hari ini ke belakang
    const today = new Date();
    const allDates: string[] = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      allDates.push(new Date(d).toISOString().split("T")[0]);
    }
```

#### 5.3 Ganti dengan:

```typescript
    // Bangun timeline dari startDate sampai hari ini
    const history: Array<{ date: string; balance: number }> = [];

    const today = new Date();
    const allDates = eachDayOfInterval({ start: startDate, end: today }).map(
      (d) => format(d, "yyyy-MM-dd")
    );
```

**Commit:** `fix: use date-fns for safe date iteration in account history`

---

## 🟡 FIX 6: Spending Comparison — Tambahkan Loading State

**File:** `src/components/spending-comparison.tsx`

### Apa masalahnya?
Jika API lambat atau gagal, komponen langsung menghilang (`return null`) tanpa feedback ke user.

### Langkah-langkah:

#### 6.1 Cari baris ini (sekitar baris 8):

```tsx
const { data: res } = useSWR("/api/analytics/comparison");
```

#### 6.2 Ganti dengan:

```tsx
const { data: res, isLoading } = useSWR("/api/analytics/comparison");
```

#### 6.3 Cari baris ini (sekitar baris 11):

```tsx
if (!comparison) return null;
```

#### 6.4 Ganti dengan:

```tsx
if (isLoading) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 mt-6 animate-pulse">
      <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

if (!comparison) return null;
```

**Commit:** `fix: add loading skeleton to spending comparison`

---

## 🟡 FIX 7: Quick-Add Panel — Tambahkan Tombol Delete Preset

**File:** `src/components/quick-add-panel.tsx`

### Apa masalahnya?
User bisa menambahkan preset tapi tidak bisa menghapusnya dari UI. API delete sudah tersedia.

### Langkah-langkah:

#### 7.1 Tambahkan fungsi delete di dalam komponen (setelah fungsi `handleApply`, sekitar baris 100):

```typescript
const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
  e.stopPropagation(); // Mencegah trigger handleApply
  if (!confirm("Hapus preset ini?")) return;

  try {
    const res = await fetch(`/api/quick-adds?id=${presetId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    toast.success("Preset dihapus");
    mutateQuickAdds();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus preset";
    toast.error(message);
  }
};
```

#### 7.2 Cari blok button preset (sekitar baris 105-116):

```tsx
{quickAdds.map((preset: any) => (
  <button
    key={preset.id}
    onClick={() => handleApply(preset)}
    className="flex min-w-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 shadow-sm snap-center border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
  >
    <span className="text-3xl">{preset.icon}</span>
    <div className="text-center">
      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate w-[100px]">{preset.name}</p>
      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(preset.amount)}</p>
    </div>
  </button>
))}
```

#### 7.3 Ganti dengan:

```tsx
{quickAdds.map((preset: any) => (
  <div key={preset.id} className="relative group snap-center">
    <button
      onClick={() => handleApply(preset)}
      className="flex min-w-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
    >
      <span className="text-3xl">{preset.icon}</span>
      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate w-[100px]">{preset.name}</p>
        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(preset.amount)}</p>
      </div>
    </button>
    <button
      onClick={(e) => handleDeletePreset(preset.id, e)}
      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
      title="Hapus preset"
    >
      ✕
    </button>
  </div>
))}
```

**Commit:** `feat: add delete button for quick-add presets`

---

## 🟡 FIX 8: Ganti `any` Types dengan Interface yang Tepat

### Apa masalahnya?
Banyak komponen menggunakan `any` yang menghilangkan type safety. Ini membuat bug lebih sulit dideteksi.

### Langkah-langkah:

#### 8.1 File: `src/components/notification-bell.tsx`

Tambahkan interface di atas komponen (setelah import):

```typescript
interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}
```

Kemudian ganti `notif: any` (baris 85) menjadi `notif: NotificationData`:

```tsx
{notifications.map((notif: NotificationData) => (
```

#### 8.2 File: `src/components/spending-comparison.tsx`

Tambahkan interface di atas komponen:

```typescript
interface ComparisonItem {
  categoryId: string;
  categoryName: string;
  icon: string;
  currentMonth: number;
  previousMonth: number;
  changePercent: number;
  changeDirection: "UP" | "DOWN" | "SAME";
}
```

Ganti `item: any` (baris 30) menjadi `item: ComparisonItem`:

```tsx
{comparison.categories.map((item: ComparisonItem) => {
```

#### 8.3 File: `src/components/bulk-action-menu.tsx`

Ganti interface `BulkActionMenuProps` (baris 13-18):

```typescript
interface CategoryItem {
  id: string;
  name: string;
  icon?: string;
  children?: CategoryItem[];
}

interface BulkActionMenuProps {
  selectedIds: string[];
  categories: CategoryItem[];
  onClearSelection: () => void;
  onSuccess: () => void;
}
```

Kemudian ganti `child: any` (baris 105) menjadi `child: CategoryItem`:

```tsx
{c.children.map((child: CategoryItem) => (
```

#### 8.4 File: `src/components/quick-add-panel.tsx`

Tambahkan interface:

```typescript
interface QuickAddPreset {
  id: string;
  name: string;
  amount: number;
  icon: string;
  categoryId: string;
  accountId: string;
  category: { id: string; name: string; icon: string | null; type: string };
  account: { id: string; name: string; icon: string | null };
}

interface AccountOption {
  id: string;
  name: string;
  icon: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
  icon: string | null;
}
```

Kemudian ganti semua `any`:
- `preset: any` → `preset: QuickAddPreset`
- `acc: any` → `acc: AccountOption`
- `cat: any` → `cat: CategoryOption`
- `catch (err: any)` → `catch (err: unknown)` lalu gunakan `err instanceof Error ? err.message : "Gagal"`

**Commit:** `refactor: replace any types with proper interfaces`

---

## 📋 Urutan Commit Final

Setelah semua fix selesai, push ke remote:

```bash
git add .
git push origin feature/new-and-fix-bug
```

Atau jika kamu commit per-section (disarankan):

| # | Commit Message | File yang Diubah |
|---|---------------|------------------|
| 1 | `fix: migrate quick-adds API to resolveUserId and add try/catch` | `src/app/api/quick-adds/route.ts` |
| 2 | `fix: bulk delete now reverses account balances` | `src/app/api/transactions/bulk/route.ts` |
| 3 | `fix: show notification action buttons on mobile` | `src/components/notification-bell.tsx` |
| 4 | `fix: use unique SVG gradient ID per chart instance` | `src/components/balance-history-chart.tsx` |
| 5 | `fix: use date-fns for safe date iteration` | `src/app/api/accounts/[id]/history/route.ts` |
| 6 | `fix: add loading skeleton to spending comparison` | `src/components/spending-comparison.tsx` |
| 7 | `feat: add delete button for quick-add presets` | `src/components/quick-add-panel.tsx` |
| 8 | `refactor: replace any types with proper interfaces` | 4 component files |

---

## ✅ Checklist Verifikasi Akhir

Setelah semua fix, pastikan:

- [ ] `pnpm build` berhasil tanpa error
- [ ] Buka app, login, coba quick-add → transaksi terbuat dan saldo berubah
- [ ] Buka History → pilih beberapa transaksi → bulk delete → saldo kembali normal
- [ ] Buka dashboard → cek notification bell muncul dan bisa diklik
- [ ] Buka dashboard → cek grafik saldo muncul dengan benar
- [ ] Buka analytics → spending comparison muncul loading skeleton lalu data
- [ ] Hover di preset quick-add → tombol ✕ muncul dan bisa hapus

> [!IMPORTANT]
> **FIX 1 dan FIX 2 adalah WAJIB sebelum merge.** Sisanya sangat disarankan tapi tidak blocking.
