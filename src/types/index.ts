/**
 * types/index.ts — Type Definitions (Kontrak Data Aplikasi)
 *
 * Tujuan: Mendefinisikan semua tipe yang digunakan antar layer:
 * API ↔ UI ↔ Database. Mengikuti prinsip SoC — tipe dipisah dari logika.
 */

// ============================================================
// ENUM — Tipe transaksi yang didukung
// ============================================================

/** Tipe transaksi keuangan */
export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

/** Tipe akun keuangan */
export type CategoryType = "INCOME" | "EXPENSE";

// ============================================================
// INTERFACE — Shape data dari API
// ============================================================

/** Data akun keuangan pengguna */
export interface AccountData {
  id: string;
  name: string;
  balance: number;
  uangGoib: number;
  icon?: string | null;
  color?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Data kategori transaksi */
export interface CategoryData {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string | null;
}

/** Data transaksi lengkap (dengan relasi akun & kategori) */
export interface TransactionData {
  id: string;
  amount: number;
  type: TransactionType;
  description?: string | null;
  date: Date;
  createdAt: Date;
  isSynced: boolean;
  accountId: string;
  account: Pick<AccountData, "id" | "name" | "icon" | "color">;
  categoryId?: string | null;
  category?: Pick<CategoryData, "id" | "name" | "icon"> | null;
  // Field khusus TRANSFER
  toAccountId?: string | null;
  toAccount?: Pick<AccountData, "id" | "name" | "icon" | "color"> | null;
  adminFee?: number | null;
}

// ============================================================
// PAYLOAD — Shape data untuk request ke API
// ============================================================

/** Payload untuk membuat transaksi baru */
export interface CreateTransactionPayload {
  amount: number;
  type: TransactionType;
  accountId: string;
  categoryId?: string;
  description?: string;
  date?: string; // ISO string dari client
  // Hanya untuk TRANSFER
  toAccountId?: string;
  adminFee?: number;
}

/** Payload untuk membuat akun baru */
export interface CreateAccountPayload {
  name: string;
  balance?: number;
  icon?: string;
  color?: string;
}

// ============================================================
// RESPONSE — Shape response dari API
// ============================================================

/** Response standar untuk operasi yang berhasil */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/** Response standar untuk operasi yang gagal */
export interface ApiErrorResponse {
  success: false;
  error: string;
}

/** Union type untuk semua response API */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Result dari operasi sync */
export interface SyncResult {
  synced: number;
  failed: number;
  total: number;
}
