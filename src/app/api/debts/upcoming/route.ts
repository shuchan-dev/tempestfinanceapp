/**
 * API Route: /api/debts/upcoming
 *
 * GET  — Ambil daftar hutang/piutang yang jatuh tempo dalam 7 hari ke depan atau sudah lewat
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcomingDebts = await db.debt.findMany({
      where: {
        userId: userId!,
        isPaid: false,
        deletedAt: null,
        dueDate: {
          lte: sevenDaysFromNow,
          not: null,
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json({ success: true, data: upcomingDebts });
  } catch (error) {
    console.error("[GET /api/debts/upcoming] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data hutang jatuh tempo" },
      { status: 500 },
    );
  }
}
