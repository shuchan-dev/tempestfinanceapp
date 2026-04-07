import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import type { ApiResponse } from "@/types";
import { logger } from "@/lib/logger";

export async function GET(): Promise<NextResponse<ApiResponse<any>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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

    return NextResponse.json({
      success: true,
      data: budgetProgress,
    });
  } catch (error) {
    logger.error("[GET /api/analytics/budgets] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil budgets analitik" },
      { status: 500 },
    );
  }
}
