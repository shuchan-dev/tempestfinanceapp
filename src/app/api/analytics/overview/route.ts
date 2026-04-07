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
    const daysPassed = Math.max(now.getDate(), 1);

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

    return NextResponse.json({
      success: true,
      data: {
        burnRate,
        totalExpenseThisMonth,
        totalIncomeThisMonth,
        netFlowThisMonth,
      },
    });
  } catch (error) {
    logger.error("[GET /api/analytics/overview] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil overview analitik" },
      { status: 500 },
    );
  }
}
