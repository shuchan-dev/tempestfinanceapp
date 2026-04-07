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
import { validateString, validateNumber, sanitizeString } from "@/lib/validators";
import { checkOwnership } from "@/lib/ownership-check";
import type { CreateAccountPayload, ApiResponse, AccountData } from "@/types";
import { Prisma } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";

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
    logger.error("[GET /api/accounts] Error:", error);
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

    if (!validateString(body.name, 1)) {
      return NextResponse.json(
        { success: false, error: "Nama akun tidak boleh kosong" },
        { status: 400 },
      );
    }

    // Validasi balance tidak boleh negatif
    if (body.balance !== undefined && !validateNumber(body.balance, 0)) {
      return NextResponse.json(
        { success: false, error: "Saldo tidak boleh negatif" },
        { status: 400 },
      );
    }

    // Sanitization
    body.name = sanitizeString(body.name)!;

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
    logger.error("[POST /api/accounts] Error:", error);
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
    const { error: ownershipError, item: account } = await checkOwnership("account", id, userId!);
    if (ownershipError || !account) return ownershipError || NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    
    // Include children manually as checkOwnership doesn't include it
    const accountWithChildren = await db.account.findUnique({
      where: { id },
      include: { children: true }
    });
    
    if (!accountWithChildren) {
       return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    let totalBalance = accountWithChildren.balance;
    let totalUangGoib = accountWithChildren.uangGoib;
    if (accountWithChildren.children) {
      for (const child of accountWithChildren.children) {
        totalBalance += child.balance;
        totalUangGoib += child.uangGoib;
      }
    }

    if (totalBalance !== 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Gagal: Total saldo harus 0 sebelum menghapus akun. Saat ini: ${totalBalance}`,
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
      accountWithChildren.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(accountWithChildren.children?.map((c: any) => c.id) || []),
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
    logger.error("[DELETE /api/accounts] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus akun" },
      { status: 500 },
    );
  }
}
