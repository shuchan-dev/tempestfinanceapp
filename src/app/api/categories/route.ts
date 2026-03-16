/**
 * API Route: /api/categories
 *
 * GET    — Ambil semua kategori milik user aktif
 * POST   — Buat kategori baru untuk user aktif
 * DELETE — Hapus kategori milik user aktif
 *
 * Prinsip: SoC — setiap operasi terfilter oleh userId dari sesi.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import type { ApiResponse, CategoryData } from "@/types";

// ─── Helper: Ambil userId dari sesi atau kembalikan error ─────
async function resolveUserId() {
  const userId = await getUserId();
  if (!userId) return { userId: null, error: NextResponse.json({ success: false as const, error: "Tidak terautentikasi" }, { status: 401 }) };
  return { userId, error: null };
}

// ─── GET /api/categories ──────────────────────────────────────
/** Mengambil semua kategori milik user aktif. Filter opsional: ?type=EXPENSE|INCOME */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<CategoryData[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const categories = await db.category.findMany({
      where: { userId: userId!, ...(type ? { type } : {}) },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: categories as CategoryData[] });
  } catch (error) {
    console.error("[GET /api/categories] Error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil kategori" }, { status: 500 });
  }
}

// ─── POST /api/categories ─────────────────────────────────────
/** Membuat kategori baru yang dikaitkan ke user yang sedang login. */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<CategoryData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body: { name: string; type: string; icon?: string } = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json({ success: false, error: "Nama kategori tidak boleh kosong" }, { status: 400 });
    }
    if (!["INCOME", "EXPENSE"].includes(body.type)) {
      return NextResponse.json({ success: false, error: "Tipe kategori harus INCOME atau EXPENSE" }, { status: 400 });
    }

    const category = await db.category.create({
      data: {
        name: body.name.trim(),
        type: body.type,
        icon: body.icon,
        userId: userId!,
      },
    });

    return NextResponse.json({ success: true, data: category as CategoryData }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/categories] Error:", error);
    return NextResponse.json({ success: false, error: "Gagal membuat kategori" }, { status: 500 });
  }
}

// ─── DELETE /api/categories ───────────────────────────────────
/** Menghapus kategori milik user aktif. Null-kan referensi transaksi terkait. */
export async function DELETE(req: NextRequest): Promise<NextResponse<ApiResponse<boolean>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID Kategori wajib diisi" }, { status: 400 });
    }

    // Pastikan kategori ini milik user aktif (mencegah IDOR attack)
    const category = await db.category.findFirst({ where: { id, userId: userId! } });
    if (!category) {
      return NextResponse.json({ success: false, error: "Kategori tidak ditemukan" }, { status: 404 });
    }

    await db.$transaction(async (tx: any) => {
      // Null-kan categoryId di semua transaksi terkait sebelum hapus
      await tx.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
      await tx.category.delete({ where: { id } });
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    console.error("[DELETE /api/categories] Error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus kategori" }, { status: 500 });
  }
}
