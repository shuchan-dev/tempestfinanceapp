import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";

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

    if (!name || !pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      const failureCookies = recordLoginFailure(req);
      const response = NextResponse.json(
        { success: false, error: "Nama dan PIN 6 digit angka wajib diisi" },
        { status: 400 },
      );
      response.headers.append("Set-Cookie", failureCookies.setCookieStart);
      response.headers.append("Set-Cookie", failureCookies.setCookieTime);
      return response;
    }

    // Gunakan findFirst karena 'name' bukan @unique di schema
    // SQLite/Turso tidak support mode:"insensitive", bandingkan lowercase di sisi aplikasi
    const normalizedName = name.trim().toLowerCase();
    const existingUser = await db.user.findFirst({
      where: {
        name: normalizedName,
      },
    });

    if (existingUser) {
      const failureCookies = recordLoginFailure(req);
      const response = NextResponse.json(
        {
          success: false,
          error: "Nama ini sudah terdaftar. Silakan gunakan nama lain.",
        },
        { status: 400 },
      );
      response.headers.append("Set-Cookie", failureCookies.setCookieStart);
      response.headers.append("Set-Cookie", failureCookies.setCookieTime);
      return response;
    }

    // Hash PIN sebelum disimpan
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    await db.user.create({
      data: {
        name: normalizedName, // Simpan dalam lowercase untuk konsistensi
        pin: hashedPin, // Simpan hasil hash, bukan plaintext
        isApproved: false,
      },
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Pendaftaran berhasil. Tunggu persetujuan admin.",
      },
      { status: 201 },
    );

    // Clear failed attempt cookies on successful registration
    const clearCookies = clearLoginFailure();
    clearCookies.forEach((cookie) =>
      response.headers.append("Set-Cookie", cookie),
    );

    return response;
  } catch (error) {
    logger.error("[POST /api/auth/register] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mendaftarkan pengguna" },
      { status: 500 },
    );
  }
}
