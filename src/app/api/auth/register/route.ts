import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs"; // Pastikan sudah install bcryptjs

export async function POST(req: NextRequest) {
  try {
    const { name, pin } = await req.json();

    if (!name || !pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "Nama dan PIN 6 digit angka wajib diisi" },
        { status: 400 },
      );
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
      return NextResponse.json(
        {
          success: false,
          error: "Nama ini sudah terdaftar. Silakan gunakan nama lain.",
        },
        { status: 400 },
      );
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

    return NextResponse.json(
      {
        success: true,
        message: "Pendaftaran berhasil. Tunggu persetujuan admin.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/auth/register] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mendaftarkan pengguna" },
      { status: 500 },
    );
  }
}
