/**
 * API Route: /api/transactions/[id]
 *
 * PATCH — Update a transaction
 * DELETE — Soft delete a transaction
 *
 * This route handler delegates to the parent route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import type { ApiResponse, TransactionData } from "@/types";

// ─── PATCH /api/transactions/[id] ─────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<TransactionData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID transaksi tidak ditemukan" },
        { status: 400 },
      );
    }

    const body = await req.json();

    // Validasi kepemilikan transaksi
    const existingTx = await db.transaction.findFirst({
      where: { id, userId: userId!, deletedAt: null },
    });

    if (!existingTx) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaksi tidak ditemukan atau sudah dihapus",
        },
        { status: 404 },
      );
    }

    if (body.type && body.type !== existingTx.type) {
      return NextResponse.json(
        { success: false, error: "Perubahan tipe transaksi tidak didukung via Edit" },
        { status: 400 },
      );
    }
    if (body.accountId && body.accountId !== existingTx.accountId) {
      return NextResponse.json(
        { success: false, error: "Perubahan akun asal tidak didukung via Edit" },
        { status: 400 },
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    const balanceUpdateQueries: any[] = [];

    if (body.amount !== undefined) {
      if (body.amount <= 0) {
        return NextResponse.json(
          { success: false, error: "Nominal harus lebih dari 0" },
          { status: 400 },
        );
      }
      
      if (body.amount !== existingTx.amount) {
        const diff = body.amount - existingTx.amount; // positive if increased
        if (existingTx.type === "EXPENSE") {
          balanceUpdateQueries.push(
            db.account.update({ where: { id: existingTx.accountId }, data: { balance: { decrement: diff } } })
          );
        } else if (existingTx.type === "INCOME") {
          balanceUpdateQueries.push(
            db.account.update({ where: { id: existingTx.accountId }, data: { balance: { increment: diff } } })
          );
        }
      }
      updateData.amount = body.amount;
    }
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.date !== undefined) updateData.date = new Date(body.date);
    if (body.tags !== undefined) updateData.tags = body.tags || null;

    // Update the transaction
    const updateQuery = db.transaction.update({
      where: { id },
      data: updateData,
      include: {
        account: { select: { id: true, name: true, icon: true, color: true } },
        category: { select: { id: true, name: true, icon: true } },
        toAccount: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });

    const results = await db.$transaction([...balanceUpdateQueries, updateQuery]);
    const updated = results[results.length - 1];

    return NextResponse.json({
      success: true,
      data: updated as TransactionData,
    });
  } catch (error) {
    console.error("[PATCH /api/transactions/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengupdate transaksi" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/transactions/[id] ────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<boolean>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID transaksi tidak ditemukan" },
        { status: 400 },
      );
    }

    // Validasi kepemilikan transaksi
    const existingTx = await db.transaction.findFirst({
      where: { id, userId: userId!, deletedAt: null },
    });

    if (!existingTx) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaksi tidak ditemukan atau sudah dihapus",
        },
        { status: 404 },
      );
    }

    // Revert balances
    const balanceUpdateQueries: any[] = [];
    if (existingTx.type === "EXPENSE") {
      balanceUpdateQueries.push(
        db.account.update({ where: { id: existingTx.accountId }, data: { balance: { increment: existingTx.amount } } })
      );
    } else if (existingTx.type === "INCOME") {
      balanceUpdateQueries.push(
        db.account.update({ where: { id: existingTx.accountId }, data: { balance: { decrement: existingTx.amount } } })
      );
    } else if (existingTx.type === "TRANSFER") {
      balanceUpdateQueries.push(
        db.account.update({ where: { id: existingTx.accountId }, data: { balance: { increment: existingTx.amount + (existingTx.adminFee || 0) } } })
      );
      if (existingTx.toAccountId) {
        balanceUpdateQueries.push(
          db.account.update({ where: { id: existingTx.toAccountId }, data: { balance: { decrement: existingTx.amount } } })
        );
      }
    }

    // Soft delete
    const deleteQuery = db.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await db.$transaction([...balanceUpdateQueries, deleteQuery]);

    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    console.error("[DELETE /api/transactions/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus transaksi" },
      { status: 500 },
    );
  }
}
