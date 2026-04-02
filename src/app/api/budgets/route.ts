/**
 * API Route: /api/budgets
 *
 * GET    — Ambil semua budget milik user aktif
 * POST   — Buat / update budget (upsert)
 * DELETE — Hapus budget
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import type { ApiResponse, BudgetData, CreateBudgetPayload } from "@/types";

// ─── GET /api/budgets ─────────────────────────────────────────
export async function GET(): Promise<NextResponse<ApiResponse<BudgetData[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const budgets = await db.budget.findMany({
      where: { userId: userId! },
      include: { category: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: budgets as unknown as BudgetData[] });
  } catch (error) {
    console.error("[GET /api/budgets] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data budget" },
      { status: 500 },
    );
  }
}

// ─── POST /api/budgets ────────────────────────────────────────
export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<BudgetData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body: CreateBudgetPayload = await req.json();

    if (!body.categoryId) {
      return NextResponse.json(
        { success: false, error: "Kategori wajib dipilih" },
        { status: 400 },
      );
    }
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal budget harus lebih dari 0" },
        { status: 400 },
      );
    }

    // Validasi kategori milik user
    const category = await db.category.findFirst({
      where: { id: body.categoryId, userId: userId! },
    });
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan" },
        { status: 404 },
      );
    }

    // Upsert: jika sudah ada budget untuk kategori+period ini, update
    const budget = await db.budget.upsert({
      where: {
        userId_categoryId_period: {
          userId: userId!,
          categoryId: body.categoryId,
          period: body.period ?? "MONTHLY",
        },
      },
      update: { amount: body.amount },
      create: {
        amount: body.amount,
        period: body.period ?? "MONTHLY",
        categoryId: body.categoryId,
        userId: userId!,
      },
      include: { category: true },
    });

    return NextResponse.json(
      { success: true, data: budget as unknown as BudgetData },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/budgets] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan budget" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/budgets ──────────────────────────────────────
export async function DELETE(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<boolean>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID budget tidak ditemukan" },
        { status: 400 },
      );
    }

    const budget = await db.budget.findFirst({ where: { id, userId: userId! } });
    if (!budget) {
      return NextResponse.json(
        { success: false, error: "Budget tidak ditemukan" },
        { status: 404 },
      );
    }

    await db.budget.delete({ where: { id } });
    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    console.error("[DELETE /api/budgets] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus budget" },
      { status: 500 },
    );
  }
}
