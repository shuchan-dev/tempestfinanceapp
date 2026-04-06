/**
 * API Route: /api/goals
 *
 * GET  — Fetch all goals for the logged-in user
 * POST — Create a new goal
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import type { CreateGoalPayload, ApiResponse, GoalData } from "@/types";

// ─── GET /api/goals ──────────────────────────────────────
/**
 * Fetch all goals for the logged-in user, ordered by target date
 */
export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<GoalData[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const goals = await db.goal.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
      },
      include: {
        account: { select: { id: true, name: true } },
      },
      orderBy: { targetDate: "asc" },
    });

    return NextResponse.json({ success: true, data: goals as GoalData[] });
  } catch (error) {
    console.error("[GET /api/goals] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data goal" },
      { status: 500 },
    );
  }
}

// ─── POST /api/goals ─────────────────────────────────────
/**
 * Create a new goal for the logged-in user
 */
export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<GoalData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body: CreateGoalPayload = await req.json();

    // Validasi input
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Nama goal wajib diisi" },
        { status: 400 },
      );
    }
    if (!body.targetAmount || body.targetAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Target amount harus lebih dari 0" },
        { status: 400 },
      );
    }
    if (!body.targetDate) {
      return NextResponse.json(
        { success: false, error: "Target date wajib diisi" },
        { status: 400 },
      );
    }

    // Validasi accountId jika diberikan
    if (body.accountId) {
      const account = await db.account.findFirst({
        where: { id: body.accountId, userId: userId! },
      });
      if (!account) {
        return NextResponse.json(
          { success: false, error: "Akun tidak valid atau bukan milik Anda" },
          { status: 403 },
        );
      }
    }

    // Create goal
    const goal = await db.goal.create({
      data: {
        name: body.name.trim(),
        targetAmount: body.targetAmount,
        targetDate: new Date(body.targetDate),
        currentAmount: body.currentAmount ?? 0,
        icon: body.icon ?? null,
        color: body.color ?? null,
        accountId: body.accountId ?? null,
        userId: userId!,
      },
      include: {
        account: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: goal as GoalData },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/goals] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat goal" },
      { status: 500 },
    );
  }
}
