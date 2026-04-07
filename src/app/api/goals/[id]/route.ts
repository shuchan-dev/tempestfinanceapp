/**
 * API Route: /api/goals/[id]
 *
 * PATCH — Update a goal
 * DELETE — Delete a goal (soft delete)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import { checkOwnership } from "@/lib/ownership-check";
import type { UpdateGoalPayload, ApiResponse, GoalData } from "@/types";
import { logger } from "@/lib/logger";

// ─── PATCH /api/goals/[id] ───────────────────────────────
/**
 * Update an existing goal
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<GoalData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { id } = await params;
    const body: UpdateGoalPayload = await req.json();

    // Verify goal ownership
    const { error: ownershipError, item: existingGoal } = await checkOwnership("goal", id, userId!);
    if (ownershipError || !existingGoal) return ownershipError || NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // If updating accountId, verify ownership
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

    // Update goal
    const updatedGoal = await db.goal.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.targetAmount !== undefined && {
          targetAmount: body.targetAmount,
        }),
        ...(body.targetDate !== undefined && {
          targetDate: new Date(body.targetDate),
        }),
        ...(body.currentAmount !== undefined && {
          currentAmount: body.currentAmount,
        }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.color !== undefined && { color: body.color }),
        ...(body.accountId !== undefined && { accountId: body.accountId }),
      },
      include: {
        account: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: updatedGoal as GoalData });
  } catch (error) {
    logger.error("[PATCH /api/goals/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengupdate goal" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/goals/[id] ──────────────────────────────
/**
 * Soft delete a goal
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { id } = await params;

    // Verify goal ownership
    const { error: ownershipError, item: existingGoal } = await checkOwnership("goal", id, userId!);
    if (ownershipError || !existingGoal) return ownershipError || NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    // Soft delete
    await db.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: { id } });
  } catch (error) {
    logger.error("[DELETE /api/goals/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus goal" },
      { status: 500 },
    );
  }
}
