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
import { resolveUserId } from "@/lib/api-utils";
import type { CreateAccountPayload, ApiResponse, AccountData } from "@/types";
import { Prisma } from "@/generated/prisma/client";

// ─── GET /api/accounts ────────────────────────────────────────
/** Mengambil seluruh akun milik user yang sedang login. */
export async function GET(): Promise<NextResponse<ApiResponse<AccountData[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const accounts = await db.account.findMany({
      where: { userId: userId!, parentId: null, deletedAt: null },
      include: { children: true },
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

    // Validasi balance tidak boleh negatif
    if (body.balance !== undefined && body.balance < 0) {
      return NextResponse.json(
        { success: false, error: "Saldo tidak boleh negatif" },
        { status: 400 },
      );
    }

    const account = await db.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // 1. Buat akun baru yang berelasi ke userId
        const newAccount = await tx.account.create({
          data: {
            name: body.name.trim(),
            balance: body.balance ?? 0,
            icon: body.icon || "🏦",
            color: body.color || "#10b981",
            parentId: body.parentId || null,
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
      include: { children: true },
    });

    if (!account) {
      return NextResponse.json(
        { success: false, error: "Akun tidak ditemukan" },
        { status: 404 },
      );
    }

    let totalBalance = account.balance;
    let totalUangGoib = account.uangGoib;
    if (account.children) {
      for (const child of account.children) {
        totalBalance += child.balance;
        totalUangGoib += child.uangGoib;
      }
    }

    if (totalBalance !== 0 || totalBalance < 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Gagal: Total saldo akun induk dan kantong harus 0 sebelum dihapus!",
        },
        { status: 400 },
      );
    }

    if (totalUangGoib !== 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Gagal: Akun masih memiliki Uang Goib (hutang) sebesar ${totalUangGoib}. Lunasi dulu sebelum menghapus akun.`,
        },
        { status: 400 },
      );
    }

    const idsToDelete = [
      account.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(account.children?.map((c: any) => c.id) || []),
    ];

    await db.$transaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (tx: any) => {
        await tx.transaction.updateMany({
          where: {
            OR: [
              { accountId: { in: idsToDelete } },
              { toAccountId: { in: idsToDelete } },
            ],
          },
          data: { deletedAt: new Date() },
        });
        await tx.account.updateMany({
          where: { id: { in: idsToDelete } },
          data: { deletedAt: new Date() },
        });
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
