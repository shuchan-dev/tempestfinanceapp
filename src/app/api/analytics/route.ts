/**
 * API Route: /api/analytics
 *
 * GET — Ambil data analitik untuk dashboard analytics:
 *   - Burn rate (rata-rata pengeluaran per hari bulan ini)
 *   - Total income/expense bulan ini
 *   - Cashflow 6 bulan terakhir (untuk chart)
 *   - Budget progress per kategori
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import type { ApiResponse, AnalyticsData } from "@/types";

export async function GET(): Promise<NextResponse<ApiResponse<AnalyticsData>>> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Tidak terautentikasi" },
        { status: 401 },
      );
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysPassed = Math.max(now.getDate(), 1);

    // ── 1. Stats bulan ini ───────────────────────────────────
    const [expenseAgg, incomeAgg] = await Promise.all([
      db.transaction.aggregate({
        where: { userId, type: "EXPENSE", date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { userId, type: "INCOME", date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
    ]);

    const totalExpenseThisMonth = expenseAgg._sum.amount ?? 0;
    const totalIncomeThisMonth = incomeAgg._sum.amount ?? 0;
    const burnRate = totalExpenseThisMonth / daysPassed;
    const netFlowThisMonth = totalIncomeThisMonth - totalExpenseThisMonth;

    // ── 2. Cashflow 6 bulan terakhir ─────────────────────────
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const allTx = await db.transaction.findMany({
      where: {
        userId,
        type: { in: ["INCOME", "EXPENSE"] },
        date: { gte: sixMonthsAgo },
      },
      select: { date: true, type: true, amount: true },
    });

    // Group by bulan
    const monthlyMap = new Map<string, { income: number; expense: number }>();
    for (const tx of allTx) {
      const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) ?? { income: 0, expense: 0 };
      if (tx.type === "INCOME") existing.income += tx.amount;
      else existing.expense += tx.amount;
      monthlyMap.set(key, existing);
    }

    // Pastikan 6 bulan selalu ada (meski 0)
    const cashflow = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      cashflow.push({ month: key, ...(monthlyMap.get(key) ?? { income: 0, expense: 0 }) });
    }

    // ── 3. Budget Progress ───────────────────────────────────
    const budgets = await db.budget.findMany({
      where: { userId },
      include: { category: true },
    });

    const categoryIds = budgets.map((b) => b.categoryId);

    // Batch query: get expense sums for all matching categories in one go
    const groupedTransactions = await db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId,
        categoryId: { in: categoryIds },
        type: "EXPENSE",
        date: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    const spentMap = new Map<string, number>();
    for (const group of groupedTransactions) {
      if (group.categoryId) {
        spentMap.set(group.categoryId, group._sum.amount ?? 0);
      }
    }

    const budgetProgress = budgets.map((budget) => {
      const spent = spentMap.get(budget.categoryId) ?? 0;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      return {
        id: budget.id,
        amount: budget.amount,
        period: budget.period as "MONTHLY" | "WEEKLY",
        categoryId: budget.categoryId,
        category: budget.category as any,
        spent,
        percentage: Math.round(percentage),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        burnRate,
        totalExpenseThisMonth,
        totalIncomeThisMonth,
        netFlowThisMonth,
        cashflow,
        budgetProgress,
      },
    });
  } catch (error) {
    console.error("[GET /api/analytics] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data analitik" },
      { status: 500 },
    );
  }
}
