import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "PIN 6 digit wajib diisi" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { pin },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "PIN salah atau tidak ditemukan" },
        { status: 401 }
      );
    }

    if (!user.isApproved) {
      return NextResponse.json(
        { success: false, error: "Akun Anda belum disetujui. Silakan tunggu persetujuan." },
        { status: 403 }
      );
    }

    // Create session cookie
    const response = NextResponse.json(
      { success: true, message: "Login berhasil", name: user.name },
      { status: 200 }
    );

    // Set secure HTTP-Only cookie for simple authentication
    response.cookies.set("tempest_session", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[POST /api/auth/login] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memulai sesi login" },
      { status: 500 }
    );
  }
}
