/**
 * API Route: /api/transactions/[id]
 *
 * PATCH — Update a transaction
 * DELETE — Soft delete a transaction
 *
 * This route handler delegates to the parent route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveUserId } from "@/lib/api-utils";
import { checkOwnership } from "@/lib/ownership-check";
import { updateTransaction, deleteTransaction } from "@/services/transactionService";
import type { ExistingTransaction } from "@/services/transactionService";
import type { ApiResponse, TransactionData } from "@/types";
import { logger } from "@/lib/logger";

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
    const { error: ownershipError, item: existingTxRaw } = await checkOwnership("transaction", id, userId!);
    if (ownershipError || !existingTxRaw) return ownershipError || NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    const existingTx = existingTxRaw as unknown as ExistingTransaction;

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

    if (body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal harus lebih dari 0" },
        { status: 400 },
      );
    }

    const updated = await updateTransaction(userId!, id, body, existingTx);

    return NextResponse.json({
      success: true,
      data: updated as TransactionData,
    });
  } catch (error) {
    logger.error("[PATCH /api/transactions/:id] Error:", error);
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
    const { error: ownershipError, item: existingTxRaw } = await checkOwnership("transaction", id, userId!);
    if (ownershipError || !existingTxRaw) return ownershipError || NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    const existingTx = existingTxRaw as unknown as ExistingTransaction;

    await deleteTransaction(userId!, id, existingTx);

    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    logger.error("[DELETE /api/transactions/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus transaksi" },
      { status: 500 },
    );
  }
}
