/**
 * lib/budget-checker.ts — Check budget status and determine if alert should be shown
 */

import { db } from "@/lib/db";

export interface BudgetStatus {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
  isNearBudget: boolean; // >= 75%
  isExceeded: boolean; // >= 100%
}

// getCategorySpendingForMonth has been removed to avoid N+1 queries being used elsewhere
/**
 * Check if a category is over or near budget
 */
export async function checkBudgetStatus(
  userId: string,
  categoryId: string,
): Promise<BudgetStatus | null> {
  const budget = await db.budget.findFirst({
    where: {
      userId,
      categoryId,
      period: "MONTHLY",
      deletedAt: null,
    },
    include: {
      category: { select: { id: true, name: true, icon: true } },
    },
  });

  if (!budget) {
    return null;
  }

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  const result = await db.transaction.aggregate({
    where: {
      userId,
      categoryId,
      type: "EXPENSE",
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      deletedAt: null,
    },
    _sum: { amount: true },
  });

  const spent = result._sum.amount || 0;
  const percentage = (spent / budget.amount) * 100;

  return {
    categoryId: budget.category.id,
    categoryName: budget.category.name,
    categoryIcon: budget.category.icon ?? undefined,
    budgetAmount: budget.amount,
    spent,
    percentage,
    isNearBudget: percentage >= 75,
    isExceeded: percentage >= 100,
  };
}

/**
 * Get all exceeding or near-budget categories for user
 */
export async function checkUserBudgets(
  userId: string,
): Promise<BudgetStatus[]> {
  const budgets = await db.budget.findMany({
    where: {
      userId,
      period: "MONTHLY",
      deletedAt: null,
    },
    include: {
      category: { select: { id: true, name: true, icon: true } },
    },
  });

  if (budgets.length === 0) return [];

  // Satu query untuk semua spending per kategori bulan ini
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

  const spendingByCategory = await db.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      deletedAt: null,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
      categoryId: {
        in: budgets.map(b => b.categoryId),
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Map spending ke lookup
  const spendingMap = new Map(
    spendingByCategory.map(s => [s.categoryId, s._sum.amount || 0])
  );

  const results: BudgetStatus[] = [];

  for (const budget of budgets) {
    const spent = spendingMap.get(budget.categoryId) || 0;
    const percentage = (spent / budget.amount) * 100;

    if (percentage >= 75) {
      results.push({
        categoryId: budget.category.id,
        categoryName: budget.category.name,
        categoryIcon: budget.category.icon ?? undefined,
        budgetAmount: budget.amount,
        spent,
        percentage,
        isNearBudget: percentage >= 75 && percentage < 100,
        isExceeded: percentage >= 100,
      });
    }
  }

  return results.sort((a, b) => b.percentage - a.percentage);
}
