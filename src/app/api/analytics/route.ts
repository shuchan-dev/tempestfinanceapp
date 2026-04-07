/**
 * API Route: /api/analytics
 *
 * @deprecated This monolith endpoint is deprecated. Use the following sub-endpoints instead:
 *   - GET /api/analytics/overview   — Burn rate, income/expense summary, net flow
 *   - GET /api/analytics/cashflow   — 6-month cashflow chart data
 *   - GET /api/analytics/categories — Category spending breakdown
 *   - GET /api/analytics/merchants  — Top merchants/descriptions
 *   - GET /api/analytics/budgets    — Budget progress per category
 *   - GET /api/analytics/comparison — Spending comparison
 *
 * This endpoint will be removed in a future version.
 * It currently redirects to a combined response for backward compatibility.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export async function GET(): Promise<NextResponse> {
  logger.warn("[GET /api/analytics] DEPRECATED: Use sub-endpoints (/api/analytics/overview, /cashflow, /categories, /merchants, /budgets) instead.");

  return NextResponse.json(
    {
      success: false,
      error: "Endpoint ini sudah deprecated. Gunakan sub-endpoint: /api/analytics/overview, /api/analytics/cashflow, /api/analytics/categories, /api/analytics/merchants, /api/analytics/budgets",
    },
    { status: 410 },
  );
}
