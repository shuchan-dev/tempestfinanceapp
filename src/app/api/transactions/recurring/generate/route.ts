/**
 * API Route: /api/transactions/recurring/generate
 *
 * POST — Generate instances for recurring transactions that are due today
 * This can be called from a cron job or on app startup
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import { getNextOccurrence, rruleToConfig } from "@/lib/recurrence-utils";
import type { ApiResponse } from "@/types";

export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<number>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    // Get all recurring transactions for this user that haven't generated today's instance
    const recurringTxs = await db.transaction.findMany({
      where: {
        userId: userId!,
        isRecurring: true,
        recurrenceRule: { not: null },
        deletedAt: null,
        // Only get parent transactions, not instances
        isRecurringInstance: false,
      },
      include: {
        account: true,
        category: true,
        toAccount: true,
      },
    });

    let generatedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const parentTx of recurringTxs) {
      if (!parentTx.recurrenceRule) continue;

      // Calculate next occurrence
      const config = rruleToConfig(parentTx.recurrenceRule);
      const nextDate = getNextOccurrence(parentTx.date, config);

      if (!nextDate) continue; // Recurrence ended

      // Check if next occurrence is today or in the past
      const nextDateNormalized = new Date(nextDate);
      nextDateNormalized.setHours(0, 0, 0, 0);

      if (nextDateNormalized.getTime() > today.getTime()) {
        continue; // Not due yet
      }

      // Check if instance already exists for today
      const existingInstance = await db.transaction.findFirst({
        where: {
          userId: userId!,
          recurrenceParentId: parentTx.id,
          date: {
            gte: new Date(today),
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
          },
          deletedAt: null,
        },
      });

      if (existingInstance) continue; // Already generated today

      // Create instance
      try {
        await db.transaction.create({
          data: {
            userId: userId!,
            amount: parentTx.amount,
            type: parentTx.type,
            description: parentTx.description,
            date: nextDate,
            accountId: parentTx.accountId,
            categoryId: parentTx.categoryId,
            toAccountId: parentTx.toAccountId,
            adminFee: parentTx.adminFee,
            isRecurringInstance: true,
            recurrenceParentId: parentTx.id,
            isSynced: false,
          },
        });

        generatedCount++;
      } catch (err) {
        console.error(
          `Failed to generate recurring instance for ${parentTx.id}:`,
          err,
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: generatedCount,
    });
  } catch (error) {
    console.error("[POST /api/transactions/recurring/generate] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat transaksi berulang" },
      { status: 500 },
    );
  }
}
