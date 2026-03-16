import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, pin } = await req.json();

    if (!name || !pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: "Nama dan PIN 6 digit yang valid wajib diisi" },
        { status: 400 }
      );
    }

    // Check if PIN already exists
    const existingUser = await db.user.findUnique({
      where: { pin },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "PIN sudah digunakan. Silakan gunakan PIN lain." },
        { status: 400 }
      );
    }

    const newUser = await db.user.create({
      data: {
        name,
        pin,
        isApproved: false, // Default: butuh persetujuan manual
      },
    });

    return NextResponse.json(
      { success: true, message: "Pendaftaran berhasil. Silakan tunggu persetujuan admin." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/auth/register] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mendaftarkan pengguna" },
      { status: 500 }
    );
  }
}
