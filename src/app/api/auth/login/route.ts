import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signSession } from "@/lib/session-utils";
import bcrypt from "bcryptjs";
import {
  withAuthRateLimit,
  recordLoginFailure,
  clearLoginFailure,
} from "@/lib/auth-rate-limit";

export async function POST(req: NextRequest) {
  const rateLimitCheck = withAuthRateLimit(req);
  if (rateLimitCheck?.response) return rateLimitCheck.response;

  try {
    const { name, pin } = await req.json();

    if (!name || !pin) {
      return NextResponse.json(
        { success: false, error: "Nama dan PIN wajib diisi" },
        { status: 400 },
      );
    }

    // 1. Cari user berdasarkan nama
    // SQLite/Turso tidak support mode:"insensitive", bandingkan lowercase di sisi aplikasi
    const user = await db.user.findFirst({
      where: {
        name: name.trim().toLowerCase(),
      },
    });

    // 2. Jika nama tidak ada di database
    if (!user) {
      const failureCookies = recordLoginFailure();
      const response = NextResponse.json(
        { success: false, error: "Nama tidak ditemukan di sistem." },
        { status: 404 },
      );
      response.headers.append("Set-Cookie", failureCookies.setCookieStart);
      response.headers.append("Set-Cookie", failureCookies.setCookieTime);
      return response;
    }

    // 3. Jika nama ada, cek apakah PIN-nya cocok menggunakan bcrypt
    const isPinValid = await bcrypt.compare(pin, user.pin);
    if (!isPinValid) {
      const failureCookies = recordLoginFailure();
      const response = NextResponse.json(
        { success: false, error: "PIN yang Anda masukkan salah." },
        { status: 401 }, // 401 Unauthorized
      );
      response.headers.append("Set-Cookie", failureCookies.setCookieStart);
      response.headers.append("Set-Cookie", failureCookies.setCookieTime);
      return response;
    }

    if (!user.isApproved) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun Anda belum disetujui. Silakan tunggu persetujuan.",
        },
        { status: 403 },
      );
    }

    // Create session cookie
    const response = NextResponse.json(
      { success: true, message: "Login berhasil", name: user.name },
      { status: 200 },
    );

    // Sign session token dengan HMAC — mencegah session fixation.
    // Cookie tidak menyimpan raw userId, melainkan token bertanda-tangan.
    const sessionToken = signSession(user.id);

    response.cookies.set("tempest_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 hari (lebih praktis untuk personal app)
      path: "/",
    });

    // Clear failed login attempt cookies on successful login
    const clearCookies = clearLoginFailure();
    clearCookies.forEach((cookie) =>
      response.headers.append("Set-Cookie", cookie),
    );

    return response;
  } catch (error) {
    console.error("[POST /api/auth/login] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memulai sesi login" },
      { status: 500 },
    );
  }
}
