/**
 * API Route: /api/debts
 *
 * GET   — Ambil semua hutang/piutang milik user aktif
 *         ?type=HUTANG|PIUTANG  — filter by type
 *         ?isPaid=true|false    — filter status
 * POST  — Catat hutang/piutang baru
 * PATCH — Update status (mark as paid / edit)
 * DELETE — Hapus catatan
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import { validateString, validateNumber, validateEnum, sanitizeString } from "@/lib/validators";
import { checkOwnership } from "@/lib/ownership-check";
import type { ApiResponse, DebtData, CreateDebtPayload } from "@/types";
import { logger } from "@/lib/logger";
// ─── GET /api/debts ───────────────────────────────────────────
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<DebtData[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const isPaidParam = searchParams.get("isPaid");
    const isPaid = isPaidParam === "true" ? true : isPaidParam === "false" ? false : undefined;

    const debts = await db.debt.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
        ...(type && { type }),
        ...(isPaid !== undefined && { isPaid }),
      },
      include: {
        payments: { orderBy: { date: "desc" } },
      },
      orderBy: [{ isPaid: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: debts as unknown as DebtData[] });
  } catch (error) {
    logger.error("[GET /api/debts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data hutang/piutang" },
      { status: 500 },
    );
  }
}

// ─── POST /api/debts ──────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<DebtData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body: CreateDebtPayload = await req.json();

    if (!validateEnum(body.type, ["HUTANG", "PIUTANG"])) {
      return NextResponse.json(
        { success: false, error: "Tipe harus HUTANG atau PIUTANG" },
        { status: 400 },
      );
    }
    if (!validateString(body.personName, 1)) {
      return NextResponse.json(
        { success: false, error: "Nama orang wajib diisi" },
        { status: 400 },
      );
    }
    if (!validateNumber(body.amount, 0.01)) {
      return NextResponse.json(
        { success: false, error: "Nominal harus lebih dari 0" },
        { status: 400 },
      );
    }

    // Sanitization
    body.personName = sanitizeString(body.personName)!;
    body.description = sanitizeString(body.description) || undefined;

    const debt = await db.debt.create({
      data: {
        type: body.type,
        personName: body.personName.trim(),
        amount: body.amount,
        description: body.description,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        userId: userId!,
      },
    });

    return NextResponse.json(
      { success: true, data: debt as unknown as DebtData },
      { status: 201 },
    );
  } catch (error) {
    logger.error("[POST /api/debts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan catatan" },
      { status: 500 },
    );
  }
}

// ─── PATCH /api/debts ─────────────────────────────────────────
/** Mark as paid atau edit catatan */
export async function PATCH(req: NextRequest): Promise<NextResponse<ApiResponse<DebtData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID catatan tidak ditemukan" },
        { status: 400 },
      );
    }

    const { error: ownershipError } = await checkOwnership("debt", id, userId!);
    if (ownershipError) return ownershipError;

    const body: { isPaid?: boolean } = await req.json();

    const updated = await db.debt.update({
      where: { id },
      data: {
        ...(body.isPaid !== undefined && {
          isPaid: body.isPaid,
          paidAt: body.isPaid ? new Date() : null,
        }),
      },
    });

    return NextResponse.json({ success: true, data: updated as unknown as DebtData });
  } catch (error) {
    logger.error("[PATCH /api/debts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui catatan" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/debts ────────────────────────────────────────
export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse<boolean>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID catatan tidak ditemukan" },
        { status: 400 },
      );
    }

    const { error: ownershipError } = await checkOwnership("debt", id, userId!);
    if (ownershipError) return ownershipError;

    await db.debt.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    logger.error("[DELETE /api/debts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus catatan" },
      { status: 500 },
    );
  }
}
