import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";

// POST /api/transactions/bulk
// Body: { action: 'delete' | 'recategorize', transactionIds: string[], targetCategoryId?: string }
export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body = await req.json();

    if (
      !body.action ||
      !body.transactionIds ||
      !Array.isArray(body.transactionIds) ||
      body.transactionIds.length === 0
    ) {
      return NextResponse.json(
        { success: false, error: "Tindakan dan ID transaksi tidak valid" },
        { status: 400 }
      );
    }

    const { action, transactionIds, targetCategoryId } = body;

    // Pastikan semua transaksi milik user aktif (Anti-IDOR)
    const validTransactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: userId!,
        deletedAt: null, // Hanya yang belum dihapus
      },
      select: {
        id: true,
        amount: true,
        type: true,
        accountId: true,
        toAccountId: true,
        adminFee: true,
      },
    });

    if (validTransactions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transaksi tidak ditemukan atau akses ditolak" },
        { status: 404 }
      );
    }

    const validIds = validTransactions.map((tx) => tx.id);

    // ─── ACTION: DELETE ─────────────────────────────────────
    if (action === "delete") {
      // 1. Kembalikan saldo untuk setiap transaksi
      for (const tx of validTransactions) {
        if (tx.type === "EXPENSE") {
          // Expense: saldo tambah kembali
          await db.account.update({
            where: { id: tx.accountId },
            data: { balance: { increment: tx.amount } },
          });
        } else if (tx.type === "INCOME") {
          // Income: saldo kurangi kembali
          await db.account.update({
            where: { id: tx.accountId },
            data: { balance: { decrement: tx.amount } },
          });
        } else if (tx.type === "TRANSFER") {
          // Transfer: kembalikan ke sumber, kurangi dari tujuan
          const fee = tx.adminFee || 0;
          await db.account.update({
            where: { id: tx.accountId },
            data: { balance: { increment: tx.amount + fee } },
          });
          if (tx.toAccountId) {
            await db.account.update({
              where: { id: tx.toAccountId },
              data: { balance: { decrement: tx.amount } },
            });
          }
        }
      }

      // 2. Soft delete semua transaksi
      await db.transaction.updateMany({
        where: { id: { in: validIds } },
        data: { deletedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: `${validIds.length} transaksi dihapus dan saldo dikembalikan`,
      });
    }

    // ─── ACTION: RECATEGORIZE ───────────────────────────────
    if (action === "recategorize") {
      if (!targetCategoryId) {
        return NextResponse.json(
          { success: false, error: "ID Kategori target harus diisi" },
          { status: 400 }
        );
      }

      // Verifikasi kategori milik user
      const category = await db.category.findFirst({
        where: { id: targetCategoryId, userId: userId! },
      });

      if (!category) {
        return NextResponse.json(
          { success: false, error: "Kategori tidak ditemukan" },
          { status: 404 }
        );
      }

      await db.transaction.updateMany({
        where: { id: { in: validIds } },
        data: { categoryId: targetCategoryId },
      });

      return NextResponse.json({
        success: true,
        message: `${validIds.length} transaksi diubah ke kategori "${category.name}"`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Aksi tidak dikenal" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[POST /api/transactions/bulk] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memproses bulk action" },
      { status: 500 }
    );
  }
}
