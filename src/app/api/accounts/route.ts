/**
 * API Route: /api/accounts
 *
 * GET    — Ambil semua akun milik user aktif
 * POST   — Buat akun baru untuk user aktif
 * DELETE — Hapus akun milik user aktif (saldo harus 0)
 *
 * Prinsip: SoC — setiap operasi terfilter oleh userId dari sesi.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import type { CreateAccountPayload, ApiResponse, AccountData } from "@/types";

// ─── Helper: Ambil userId dari sesi atau kembalikan error ─────
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

// ─── GET /api/accounts ────────────────────────────────────────
/** Mengambil seluruh akun milik user yang sedang login. */
export async function GET(): Promise<NextResponse<ApiResponse<AccountData[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const accounts = await db.account.findMany({
      where: { userId: userId! },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    console.error("[GET /api/accounts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data akun" },
      { status: 500 },
    );
  }
}

// ─── POST /api/accounts ───────────────────────────────────────
/** Membuat akun baru dan mengaitkannya ke user yang sedang login. */
export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<AccountData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body: CreateAccountPayload = await req.json();

    if (!body.name?.trim()) {
      return NextResponse.json(
        { success: false, error: "Nama akun tidak boleh kosong" },
        { status: 400 },
      );
    }

    const account = await db.$transaction(
      async (tx: any) => {
        // 1. Buat akun baru yang berelasi ke userId
        const newAccount = await tx.account.create({
          data: {
            name: body.name.trim(),
            balance: body.balance ?? 0,
            icon: body.icon || "🏦",
            color: body.color || "#10b981",
            userId: userId!,
          },
        });

        // 2. Jika ada saldo awal > 0, catat sebagai transaksi INCOME pertama
        if (body.balance && body.balance > 0) {
          await tx.transaction.create({
            data: {
              amount: body.balance,
              type: "INCOME",
              description: "Saldo Awal",
              date: new Date(),
              isSynced: false,
              accountId: newAccount.id,
              userId: userId!,
            },
          });
        }

        return newAccount;
      },
      { maxWait: 10000, timeout: 20000 },
    );

    return NextResponse.json(
      { success: true, data: account as AccountData },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/accounts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat akun baru" },
      { status: 500 },
    );
  }
}

// ─── DELETE /api/accounts ─────────────────────────────────────
/** Menghapus akun milik user aktif. Wajib saldo = 0. */
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
        { success: false, error: "ID Akun tidak ditemukan" },
        { status: 400 },
      );
    }

    // Pastikan akun ini milik user aktif (mencegah IDOR attack)
    const account = await db.account.findFirst({
      where: { id, userId: userId! },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Akun tidak ditemukan" },
        { status: 404 },
      );
    }

    if (account.balance !== 0) {
      return NextResponse.json(
        { success: false, error: "Gagal: Saldo akun harus 0 sebelum dihapus!" },
        { status: 400 },
      );
    }

    await db.$transaction(
      async (tx: any) => {
        await tx.transaction.deleteMany({
          where: { OR: [{ accountId: id }, { toAccountId: id }] },
        });
        await tx.account.delete({ where: { id } });
      },
      { maxWait: 10000, timeout: 20000 },
    );

    return NextResponse.json({ success: true, data: true });
  } catch (error) {
    console.error("[DELETE /api/accounts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus akun" },
      { status: 500 },
    );
  }
}
