-- AlterTable
ALTER TABLE "Account" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "DebtPayment" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "deletedAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "isSynced" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "toAccountId" TEXT,
    "adminFee" REAL DEFAULT 0,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "adminFee", "amount", "categoryId", "createdAt", "date", "description", "id", "isSynced", "toAccountId", "type", "userId") SELECT "accountId", "adminFee", "amount", "categoryId", "createdAt", "date", "description", "id", "isSynced", "toAccountId", "type", "userId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
