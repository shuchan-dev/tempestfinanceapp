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
    });

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
      data: topMerchants,
    });
  } catch (error) {
    logger.error("[GET /api/analytics/merchants] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil merchants analitik" },
      { status: 500 },
    );
  }
}
