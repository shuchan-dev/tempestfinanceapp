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

    return NextResponse.json({
      success: true,
      data: cashflow,
    });
  } catch (error) {
    logger.error("[GET /api/analytics/cashflow] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil cashflow analitik" },
      { status: 500 },
    );
  }
}
