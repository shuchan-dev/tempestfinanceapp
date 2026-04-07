import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

// PATCH /api/notifications/:id
// Mark as read
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { id } = await params;

    const existing = await db.notification.findFirst({
      where: { id, userId: userId! },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Notifikasi tidak ditemukan" }, { status: 404 });
    }

    const updated = await db.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error("[PATCH /api/notifications/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal update notifikasi" },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { id } = await params;

    const existing = await db.notification.findFirst({
      where: { id, userId: userId! },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Notifikasi tidak ditemukan" }, { status: 404 });
    }

    await db.notification.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    logger.error("[DELETE /api/notifications/:id] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus notifikasi" },
      { status: 500 }
    );
  }
}
