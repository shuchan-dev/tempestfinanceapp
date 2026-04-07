import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import { checkOwnership } from "@/lib/ownership-check";
import type { ApiResponse, CreateDebtPaymentPayload, DebtPaymentData } from "@/types";
import { logger } from "@/lib/logger";

// ─── POST /api/debts/payments ──────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<DebtPaymentData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body: CreateDebtPaymentPayload = await req.json();

    if (!body.debtId) {
      return NextResponse.json(
        { success: false, error: "ID catatan hutang/piutang wajib diisi" },
        { status: 400 }
      );
    }
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal cicilan harus lebih dari 0" },
        { status: 400 }
      );
    }

    const { error: ownershipError, item: debtRaw } = await checkOwnership("debt", body.debtId, userId!);
    if (ownershipError || !debtRaw) return ownershipError || NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    const debt = debtRaw as any;

    // Hitung total sisa pembayaran menggunakan query database
    const paymentAgg = await db.debtPayment.aggregate({
      _sum: { amount: true },
      where: { debtId: debt.id },
    });
    const totalPaid = paymentAgg._sum.amount ?? 0;
    const remaining = debt.amount - totalPaid;

    if (body.amount > remaining) {
      return NextResponse.json(
        { success: false, error: "Nominal pembayaran melebihi sisa hutang/piutang" },
        { status: 400 }
      );
    }

    // Buat pembayaran
    const payment = await db.debtPayment.create({
      data: {
        amount: body.amount,
        date: body.date ? new Date(body.date) : new Date(),
        debtId: debt.id,
        userId: userId!,
      },
    });

    // Cek apakah sekarang lunas
    const newTotalPaid = totalPaid + payment.amount;
    if (newTotalPaid >= debt.amount && !debt.isPaid) {
      await db.debt.update({
        where: { id: debt.id },
        data: {
          isPaid: true,
          paidAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      { success: true, data: payment as unknown as DebtPaymentData },
      { status: 201 }
    );
  } catch (err) {
    logger.error("[POST /api/debts/payments] Error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan pembayaran" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/debts/payments ────────────────────────────────────
export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse<boolean>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID pembayaran tidak ditemukan" },
        { status: 400 }
      );
    }

    const { error: ownershipError } = await checkOwnership("debtPayment", id, userId!);
    if (ownershipError) return ownershipError;

    const payment = await db.debtPayment.findFirst({
      where: { id, userId: userId! },
      include: { debt: true },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Pembayaran tidak ditemukan" },
        { status: 404 }
      );
    }

    // Hapus pembayaran (soft delete)
    await db.debtPayment.update({ where: { id }, data: { deletedAt: new Date() } });

    // Jika tadinya lunas, cek apakah skrg jadi belum lunas (kurang dari amount)
    if (payment.debt.isPaid) {
      const remainingAgg = await db.debtPayment.aggregate({
        _sum: { amount: true },
        where: { debtId: payment.debt.id },
      });
      const totalPaid = remainingAgg._sum.amount ?? 0;
      if (totalPaid < payment.debt.amount) {
        await db.debt.update({
          where: { id: payment.debt.id },
          data: { isPaid: false, paidAt: null },
        });
      }
    }

    return NextResponse.json({ success: true, data: true });
  } catch (err) {
    logger.error("[DELETE /api/debts/payments] Error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus pembayaran" },
      { status: 500 }
    );
  }
}
