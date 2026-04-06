import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";

export async function GET() {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const quickAdds = await db.quickAdd.findMany({
      where: { userId: userId! },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
        account: { select: { id: true, name: true, icon: true } },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ success: true, data: quickAdds });
  } catch (err) {
    console.error("[GET /api/quick-adds] Error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil quick-adds" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body = await req.json();
    const { name, amount, icon, categoryId, accountId } = body;

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

    const count = await db.quickAdd.count({ where: { userId: userId! } });

    const quickAdd = await db.quickAdd.create({
      data: {
        name,
        amount,
        icon: icon || "💸",
        categoryId,
        accountId,
        userId: userId!,
        order: count,
      },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
        account: { select: { id: true, name: true, icon: true } },
      },
    });

    return NextResponse.json({ success: true, data: quickAdd }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/quick-adds] Error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal membuat quick-add" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID diperlukan" },
        { status: 400 }
      );
    }

    const existing = await db.quickAdd.findFirst({
      where: { id, userId: userId! },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Quick-add tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.quickAdd.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id } });
  } catch (err) {
    console.error("[DELETE /api/quick-adds] Error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus quick-add" },
      { status: 500 }
    );
  }
}
