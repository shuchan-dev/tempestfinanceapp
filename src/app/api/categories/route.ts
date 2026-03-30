/**
 * API Route: /api/categories
 *
 * GET    — Ambil kategori milik user aktif
 *          ?type=EXPENSE|INCOME  — filter by type
 *          ?nested=true          — return tree structure (parent + children)
 * POST   — Buat kategori baru (support parentId untuk sub-kategori)
 * DELETE — Hapus kategori (cegah hapus parent yang masih punya children)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import type { ApiResponse, CategoryData } from "@/types";

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

// ─── GET /api/categories ──────────────────────────────────────
export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<CategoryData[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const nested = searchParams.get("nested") === "true";

    if (nested) {
      // Return tree: hanya parent (parentId = null) beserta children-nya
      const parents = await db.category.findMany({
        where: {
          userId: userId!,
          parentId: null,
          ...(type ? { type } : {}),
        },
        include: {
          children: {
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      });
      return NextResponse.json({ success: true, data: parents as unknown as CategoryData[] });
    }

    // Default flat list — semua kategori (parent & children)
    const categories = await db.category.findMany({
      where: { userId: userId!, ...(type ? { type } : {}) },
      orderBy: [{ parentId: "asc" }, { order: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ success: true, data: categories as unknown as CategoryData[] });
  } catch (error) {
    console.error("[GET /api/categories] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil kategori" },
      { status: 500 },
    );
  }
}

// ─── POST /api/categories ─────────────────────────────────────
export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<CategoryData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body: { name: string; type: string; icon?: string; parentId?: string } =
      await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama kategori tidak boleh kosong" },
        { status: 400 },
      );
    }
    if (!["INCOME", "EXPENSE"].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: "Tipe kategori harus INCOME atau EXPENSE" },
        { status: 400 },
      );
    }

    // Jika ada parentId, validasi bahwa parent milik user yang sama
    if (body.parentId) {
      const parent = await db.category.findFirst({
        where: { id: body.parentId, userId: userId! },
      });
      if (!parent) {
        return NextResponse.json(
          { success: false, error: "Kategori parent tidak ditemukan" },
          { status: 404 },
        );
      }
      // Sub-kategori harus bertipe sama dengan parent-nya
      if (parent.type !== body.type) {
        return NextResponse.json(
          { success: false, error: "Tipe sub-kategori harus sama dengan parent" },
          { status: 400 },
        );
      }
    }

    // Hitung order (taruh di akhir)
    const lastCat = await db.category.findFirst({
      where: { userId: userId!, parentId: body.parentId ?? null },
      orderBy: { order: "desc" },
    });
    const order = (lastCat?.order ?? -1) + 1;

    const category = await db.category.create({
      data: {
        name: body.name.trim(),
        type: body.type,
        icon: body.icon,
        order,
        parentId: body.parentId ?? null,
        userId: userId!,
      },
    });

    return NextResponse.json(
      { success: true, data: category as unknown as CategoryData },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/categories] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat kategori" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/categories ───────────────────────────────────
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
        { success: false, error: "ID Kategori wajib diisi" },
        { status: 400 },
      );
    }

    const category = await db.category.findFirst({
      where: { id, userId: userId! },
      include: { children: { select: { id: true } } },
    });
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan" },
        { status: 404 },
      );
    }

    // Cegah hapus parent yang masih punya sub-kategori
    if (category.children.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak bisa menghapus: kategori ini masih punya ${category.children.length} sub-kategori. Hapus sub-kategori terlebih dahulu.`,
        },
        { status: 400 },
      );
    }

    await db.$transaction(
      async (tx: any) => {
        await tx.transaction.updateMany({
          where: { categoryId: id },
          data: { categoryId: null },
        });
        await tx.budget.deleteMany({ where: { categoryId: id } });
        await tx.category.delete({ where: { id } });
      },
      { maxWait: 10000, timeout: 20000 },
    );

    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    console.error("[DELETE /api/categories] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus kategori" },
      { status: 500 },
    );
  }
}
