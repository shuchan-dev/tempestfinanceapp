/**
 * types/index.ts — Type Definitions (Kontrak Data Aplikasi)
 */

// ============================================================
// ENUM
// ============================================================
export type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";
export type CategoryType = "INCOME" | "EXPENSE";
export type BudgetPeriod = "MONTHLY" | "WEEKLY";
export type DebtType = "HUTANG" | "PIUTANG";

// ============================================================
// INTERFACE — Shape data dari API
// ============================================================

export interface AccountData {
  id: string;
  name: string;
  balance: number;
  uangGoib: number;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  children?: AccountData[];
  createdAt: Date;
  updatedAt: Date;
}

/** Data kategori — mendukung struktur Parent/Child */
export interface CategoryData {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string | null;
  order: number;
  parentId?: string | null;
  children?: CategoryData[]; // Hanya ada jika fetch dengan ?nested=true
}

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
  toAccountId?: string | null;
  toAccount?: Pick<AccountData, "id" | "name" | "icon" | "color"> | null;
  adminFee?: number | null;
  isRecurring?: boolean;
  recurrenceRule?: string | null;
  recurrenceEndDate?: Date | null;
  recurrenceParentId?: string | null;
  isRecurringInstance?: boolean;
  tags?: string | null;
}

/** Data budget threshold per kategori */
export interface BudgetData {
  id: string;
  amount: number;
  period: BudgetPeriod;
  categoryId: string;
  category: Pick<CategoryData, "id" | "name" | "icon" | "type">;
  spent?: number; // Diisi oleh analytics API
}

/** Data pembayaran hutang/piutang (angsuran) */
export interface DebtPaymentData {
  id: string;
  amount: number;
  date: Date;
  debtId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Data hutang/piutang */
export interface DebtData {
  id: string;
  type: DebtType;
  personName: string;
  amount: number;
  description?: string | null;
  dueDate?: Date | null;
  isPaid: boolean;
  paidAt?: Date | null;
  payments?: DebtPaymentData[];
  createdAt: Date;
  updatedAt: Date;
}

/** Data goal tabungan/target finansial */
export interface GoalData {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  icon?: string | null;
  color?: string | null;
  accountId?: string | null;
  account?: Pick<AccountData, "id" | "name"> | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Data analytics monthly */
export interface MonthlyData {
  month: string; // "2026-03"
  income: number;
  expense: number;
}

/** Category spending breakdown */
export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string | null;
  spent: number;
  budget?: number; // If a budget exists for this category
  percentage: number; // spent / (budget or estimate) * 100
}

/** Top merchant data */
export interface TopMerchant {
  description: string;
  amount: number;
  count: number; // How many times this merchant was used
}

/** Shape response analytics */
export interface AnalyticsData {
  burnRate: number;
  totalExpenseThisMonth: number;
  totalIncomeThisMonth: number;
  netFlowThisMonth: number;
  cashflow: MonthlyData[];
  budgetProgress: (BudgetData & { spent: number; percentage: number })[];
  categorySpending: CategorySpending[];
  topMerchants: TopMerchant[];
}

// ============================================================
// PAYLOAD
// ============================================================

export interface CreateTransactionPayload {
  amount: number;
  type: TransactionType;
  accountId: string;
  categoryId?: string;
  description?: string;
  date?: string;
  toAccountId?: string;
  adminFee?: number;
  isRecurring?: boolean;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  tags?: string;
  isRecurringInstance?: boolean;
  recurrenceParentId?: string;
}

export interface CreateAccountPayload {
  name: string;
  balance?: number;
  icon?: string;
  color?: string;
  parentId?: string;
}

export interface CreateBudgetPayload {
  categoryId: string;
  amount: number;
  period?: BudgetPeriod;
}

export interface CreateDebtPayload {
  type: DebtType;
  personName: string;
  amount: number;
  description?: string;
  dueDate?: string;
}

export interface CreateDebtPaymentPayload {
  debtId: string;
  amount: number;
  date?: string;
}

export interface CreateGoalPayload {
  name: string;
  targetAmount: number;
  targetDate: string; // ISO string
  accountId?: string;
  icon?: string;
  color?: string;
  currentAmount?: number;
}

export interface UpdateGoalPayload {
  name?: string;
  targetAmount?: number;
  targetDate?: string;
  currentAmount?: number;
  accountId?: string;
  icon?: string;
  color?: string;
}

// ============================================================
// RESPONSE
// ============================================================
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SyncResult {
  synced: number;
  failed: number;
  total: number;
}
