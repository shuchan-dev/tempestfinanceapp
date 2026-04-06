import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";

// GET — Ambil semua quick-adds milik user
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const quickAdds = await db.quickAdd.findMany({
    where: { userId },
    include: {
      category: { select: { id: true, name: true, icon: true, type: true } },
      account: { select: { id: true, name: true, icon: true } },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ success: true, data: quickAdds });
}

// POST — Buat quick-add baru
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, amount, icon, categoryId, accountId } = body;

  // Validasi
  if (!name || !amount || !categoryId || !accountId) {
    return NextResponse.json(
      { success: false, error: "Semua field wajib diisi" },
      { status: 400 }
    );
  }

  if (typeof amount !== "number" || amount <= 0) {
    return NextResponse.json(
      { success: false, error: "Nominal harus lebih dari 0" },
      { status: 400 }
    );
  }

  // Hitung order (taruh di terakhir)
  const count = await db.quickAdd.count({ where: { userId } });

  const quickAdd = await db.quickAdd.create({
    data: {
      name,
      amount,
      icon: icon || "💸",
      categoryId,
      accountId,
      userId,
      order: count,
    },
    include: {
      category: { select: { id: true, name: true, icon: true, type: true } },
      account: { select: { id: true, name: true, icon: true } },
    },
  });

  return NextResponse.json({ success: true, data: quickAdd }, { status: 201 });
}

// DELETE — Hapus quick-add by id
export async function DELETE(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "ID diperlukan" }, { status: 400 });
  }

  // Pastikan milik user ini (IDOR protection)
  const existing = await db.quickAdd.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return NextResponse.json({ success: false, error: "Quick-add tidak ditemukan" }, { status: 404 });
  }

  await db.quickAdd.delete({ where: { id } });
  return NextResponse.json({ success: true, data: { id } });
}
