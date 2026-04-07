/**
 * API Route: /api/budgets/status
 *
 * GET — Check current budget status for all categories
 * Returns budgets that are near (75%) or exceeded (100%)
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/api-utils";
import { checkUserBudgets, type BudgetStatus } from "@/lib/budget-checker";
import type { ApiResponse } from "@/types";
import { logger } from "@/lib/logger";

export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<BudgetStatus[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const alerts = await checkUserBudgets(userId!);

    return NextResponse.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    logger.error("[GET /api/budgets/status] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil status budget" },
      { status: 500 },
    );
  }
}
