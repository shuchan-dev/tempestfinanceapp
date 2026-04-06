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

    if (!body.action || !body.transactionIds || !Array.isArray(body.transactionIds) || body.transactionIds.length === 0) {
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
      },
      select: { id: true },
    });

    const validIds = validTransactions.map((tx) => tx.id);

    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Transaksi tidak ditemukan atau akses ditolak" },
        { status: 404 }
      );
    }

    if (action === "delete") {
      // Soft delete
      await db.transaction.updateMany({
        where: { id: { in: validIds } },
        data: { deletedAt: new Date() },
      });
      return NextResponse.json({ success: true, message: `${validIds.length} transaksi dihapus` });
    } 
    
    if (action === "recategorize") {
      if (!targetCategoryId) {
        return NextResponse.json(
          { success: false, error: "ID Kategori target harus diisi" },
          { status: 400 }
        );
      }

      await db.transaction.updateMany({
        where: { id: { in: validIds } },
        data: { categoryId: targetCategoryId },
      });

      return NextResponse.json({ success: true, message: `${validIds.length} transaksi diubah kategori` });
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
