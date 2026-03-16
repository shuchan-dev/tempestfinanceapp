-- Migration: Tambahkan userId ke Account, Category, dan Transaction
-- Strategi: Hapus semua data lama (sebelum sistem multi-user diterapkan) agar
-- kolom NOT NULL dengan FK bisa ditambahkan dengan bersih.
-- Data lama tidak akan kompatibel dengan sistem sesi baru.

-- Step 1: Hapus data lama yang tidak terikat dengan user manapun
DELETE FROM "Transaction";
DELETE FROM "Account";
DELETE FROM "Category";

-- Step 2: Tambahkan kolom userId NOT NULL
ALTER TABLE "Account" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'init';
ALTER TABLE "Category" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'init';
ALTER TABLE "Transaction" ADD COLUMN "userId" TEXT NOT NULL DEFAULT 'init';

-- Step 3: Hapus default value (kolom ini wajib diisi saat insert)
ALTER TABLE "Account" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Category" ALTER COLUMN "userId" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "userId" DROP DEFAULT;

-- Step 4: Tambahkan Foreign Key ke User
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


