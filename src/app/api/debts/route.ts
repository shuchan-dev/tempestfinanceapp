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
import { getUserId } from "@/lib/session";
import type { ApiResponse, DebtData, CreateDebtPayload } from "@/types";

async function resolveUserId() {
  const userId = await getUserId();
  if (!userId)
    return {
      userId: null,
      error: NextResponse.json(
        { success: false as const, error: "Tidak terautentikasi" },
        { status: 401 },
      ),
    };
  return { userId, error: null };
}

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
        ...(type && { type }),
        ...(isPaid !== undefined && { isPaid }),
      },
      orderBy: [{ isPaid: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: debts as unknown as DebtData[] });
  } catch (error) {
    console.error("[GET /api/debts] Error:", error);
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

    if (!["HUTANG", "PIUTANG"].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: "Tipe harus HUTANG atau PIUTANG" },
        { status: 400 },
      );
    }
    if (!body.personName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama orang wajib diisi" },
        { status: 400 },
      );
    }
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal harus lebih dari 0" },
        { status: 400 },
      );
    }

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
    console.error("[POST /api/debts] Error:", error);
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

    const existing = await db.debt.findFirst({ where: { id, userId: userId! } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Catatan tidak ditemukan" },
        { status: 404 },
      );
    }

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
    console.error("[PATCH /api/debts] Error:", error);
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

    const existing = await db.debt.findFirst({ where: { id, userId: userId! } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Catatan tidak ditemukan" },
        { status: 404 },
      );
    }

    await db.debt.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    console.error("[DELETE /api/debts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus catatan" },
      { status: 500 },
    );
  }
}
