import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";

// GET /api/notifications
// Ambil daftar notifikasi untuk user aktif
export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const limit = Number(req.nextUrl.searchParams.get("limit") || "20");

    const notifications = await db.notification.findMany({
      where: { userId: userId! },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await db.notification.count({
      where: { userId: userId!, isRead: false },
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      meta: { unreadCount },
    });
  } catch (error) {
    console.error("[GET /api/notifications] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil notifikasi" },
      { status: 500 },
    );
  }
}

// POST /api/notifications
// Simpan notifikasi baru (untuk testing atau service)
export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body = await req.json();

    if (!body.title || !body.message) {
      return NextResponse.json(
        { success: false, error: "Title dan Message harus diisi" },
        { status: 400 },
      );
    }

    const notification = await db.notification.create({
      data: {
        userId: userId!,
        title: body.title,
        message: body.message,
        type: body.type || "INFO",
        isRead: false,
        link: body.link || null,
      },
    });

    return NextResponse.json(
      { success: true, data: notification },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/notifications] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat notifikasi" },
      { status: 500 },
    );
  }
}

// PATCH /api/notifications
// Mark all as read
export async function PATCH(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    await db.notification.updateMany({
      where: { userId: userId!, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    console.error("[PATCH /api/notifications] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal update notifikasi" },
      { status: 500 },
    );
  }
}
