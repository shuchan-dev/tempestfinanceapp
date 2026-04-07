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

    const allTransactionsThisMonth = await db.transaction.findMany({
      where: {
        userId: userId!,
        type: "EXPENSE",
        date: { gte: startOfMonth },
        deletedAt: null,
      },
      include: { category: true },
    });

    const budgets = await db.budget.findMany({
      where: { userId: userId! },
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

    return NextResponse.json({
      success: true,
      data: categorySpending,
    });
  } catch (error) {
    logger.error("[GET /api/analytics/categories] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil kategori analitik" },
      { status: 500 },
    );
  }
}
