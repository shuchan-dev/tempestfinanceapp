/**
 * API Route: /api/analytics
 *
 * GET — Combined analytics data (backward-compatible monolith).
 * Individual sub-endpoints are also available:
 *   - /api/analytics/overview
 *   - /api/analytics/cashflow
 *   - /api/analytics/categories
 *   - /api/analytics/merchants
 *   - /api/analytics/budgets
 *   - /api/analytics/comparison
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import type { ApiResponse, AnalyticsData } from "@/types";
import { logger } from "@/lib/logger";

export async function GET(): Promise<NextResponse<ApiResponse<AnalyticsData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysPassed = Math.max(now.getDate(), 1);

    // ── 1. Stats bulan ini ───────────────────────────────────
    const [expenseAgg, incomeAgg] = await Promise.all([
      db.transaction.aggregate({
        where: { userId: userId!, type: "EXPENSE", date: { gte: startOfMonth }, deletedAt: null },
        _sum: { amount: true },
      }),
      db.transaction.aggregate({
        where: { userId: userId!, type: "INCOME", date: { gte: startOfMonth }, deletedAt: null },
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
        userId: userId!,
        deletedAt: null,
        type: { in: ["INCOME", "EXPENSE"] },
        date: { gte: sixMonthsAgo },
      },
      select: { date: true, type: true, amount: true },
    });

    const monthlyMap = new Map<string, { income: number; expense: number }>();
    for (const tx of allTx) {
      const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, "0")}`;
      const existing = monthlyMap.get(key) ?? { income: 0, expense: 0 };
      if (tx.type === "INCOME") existing.income += tx.amount;
      else existing.expense += tx.amount;
      monthlyMap.set(key, existing);
    }

    const cashflow = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      cashflow.push({
        month: key,
        ...(monthlyMap.get(key) ?? { income: 0, expense: 0 }),
      });
    }

    // ── 3. Budget Progress ───────────────────────────────────
    const budgets = await db.budget.findMany({
      where: { userId: userId! },
      include: { category: true },
    });

    const categoryIds = budgets.map((b) => b.categoryId);

    const groupedTransactions = await db.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: userId!,
        categoryId: { in: categoryIds },
        type: "EXPENSE",
        deletedAt: null,
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

    // ── 4. Category Spending ─────────────────────────────────
    const allTransactionsThisMonth = await db.transaction.findMany({
      where: {
        userId: userId!,
        type: "EXPENSE",
        date: { gte: startOfMonth },
        deletedAt: null,
      },
      include: { category: true },
    });

    const categoryMap = new Map<
      string,
      { name: string; icon?: string | null; amount: number }
    >();
    for (const tx of allTransactionsThisMonth) {
      const catId = tx.categoryId || "uncategorized";
      const catName = tx.category?.name || "Uncategorized";
      const catIcon = tx.category?.icon;
      const existing = categoryMap.get(catId) ?? {
        name: catName,
        icon: catIcon,
        amount: 0,
      };
      existing.amount += tx.amount;
      categoryMap.set(catId, existing);
    }

    const categorySpending = Array.from(categoryMap.entries()).map(
      ([catId, data]) => {
        const budget = budgets.find((b) => b.categoryId === catId);
        const percentage = budget ? (data.amount / budget.amount) * 100 : 0;
        return {
          categoryId: catId,
          categoryName: data.name,
          categoryIcon: data.icon,
          spent: data.amount,
          budget: budget?.amount,
          percentage: Math.round(percentage),
        };
      },
    );
    categorySpending.sort((a, b) => b.spent - a.spent);

    // ── 5. Top Merchants ─────────────────────────────────────
    const merchantMap = new Map<string, { amount: number; count: number }>();
    for (const tx of allTransactionsThisMonth) {
      if (tx.description && tx.description.trim()) {
        const desc = tx.description.trim();
        const existing = merchantMap.get(desc) ?? { amount: 0, count: 0 };
        existing.amount += tx.amount;
        existing.count += 1;
        merchantMap.set(desc, existing);
      }
    }

    const topMerchants = Array.from(merchantMap.entries())
      .map(([desc, data]) => ({
        description: desc,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        burnRate,
        totalExpenseThisMonth,
        totalIncomeThisMonth,
        netFlowThisMonth,
        cashflow,
        budgetProgress,
        categorySpending,
        topMerchants,
      },
    });
  } catch (error) {
    logger.error("[GET /api/analytics] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data analitik" },
      { status: 500 },
    );
  }
}
