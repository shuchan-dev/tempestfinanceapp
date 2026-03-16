/**
 * API Route: /api/transactions
 *
 * GET  — Ambil daftar transaksi milik user aktif (pagination & filter)
 * POST — Simpan transaksi baru ke database (Instant Save)
 *
 * Prinsip: SoC — semua data difilter berdasarkan userId sesi.
 * Keamanan: Validasi kepemilikan akun sebelum eksekusi transaksi (anti-IDOR).
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import type { CreateTransactionPayload, ApiResponse, TransactionData } from "@/types";

// ─── Helper: Ambil userId dari sesi atau kembalikan error ─────
async function resolveUserId() {
  const userId = await getUserId();
  if (!userId) return { userId: null, error: NextResponse.json({ success: false as const, error: "Tidak terautentikasi" }, { status: 401 }) };
  return { userId, error: null };
}

// ─── GET /api/transactions ────────────────────────────────────
/**
 * Mengambil daftar transaksi milik user aktif, diurutkan terbaru di atas.
 * Query params: ?limit=20&page=1&type=EXPENSE&accountId=xxx
 */
export async function GET(req: NextRequest): Promise<NextResponse<ApiResponse<TransactionData[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
    const type = searchParams.get("type");
    const accountId = searchParams.get("accountId");

    const transactions = await db.transaction.findMany({
      where: {
        userId: userId!,
        ...(type && { type }),
        ...(accountId && { accountId }),
      },
      include: {
        account: { select: { id: true, name: true, icon: true, color: true } },
        category: { select: { id: true, name: true, icon: true } },
        toAccount: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    return NextResponse.json({ success: true, data: transactions as TransactionData[] });
  } catch (error) {
    console.error("[GET /api/transactions] Error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data transaksi" }, { status: 500 });
  }
}

// ─── POST /api/transactions ───────────────────────────────────
/**
 * Menyimpan transaksi baru secara atomik (Prisma $transaction).
 * Validasi kepemilikan akun dilakukan sebelum eksekusi untuk mencegah IDOR.
 */
export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<TransactionData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body: CreateTransactionPayload = await req.json();

    // ── Validasi Input ─────────────────────────────────────
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ success: false, error: "Nominal harus lebih dari 0" }, { status: 400 });
    }
    if (!body.accountId) {
      return NextResponse.json({ success: false, error: "Akun wajib dipilih" }, { status: 400 });
    }
    if (!["INCOME", "EXPENSE", "TRANSFER"].includes(body.type)) {
      return NextResponse.json({ success: false, error: "Tipe transaksi tidak valid" }, { status: 400 });
    }
    if (body.type === "TRANSFER" && !body.toAccountId) {
      return NextResponse.json({ success: false, error: "Akun tujuan wajib dipilih untuk Transfer" }, { status: 400 });
    }
    if (body.type === "TRANSFER" && body.accountId === body.toAccountId) {
      return NextResponse.json({ success: false, error: "Akun asal dan tujuan tidak boleh sama" }, { status: 400 });
    }

    // ── Validasi Kepemilikan Akun (Anti-IDOR) ──────────────
    // Pastikan accountId milik user yang sedang login
    const sourceAccount = await db.account.findFirst({ where: { id: body.accountId, userId: userId! } });
    if (!sourceAccount) {
      return NextResponse.json({ success: false, error: "Akun sumber tidak valid atau bukan milik Anda" }, { status: 403 });
    }
    // Untuk TRANSFER, pastikan toAccountId juga milik user yang sama
    if (body.type === "TRANSFER" && body.toAccountId) {
      const destAccount = await db.account.findFirst({ where: { id: body.toAccountId, userId: userId! } });
      if (!destAccount) {
        return NextResponse.json({ success: false, error: "Akun tujuan tidak valid atau bukan milik Anda" }, { status: 403 });
      }
    }

    // ── Operasi Atomik via Prisma $transaction ─────────────
    const result = await db.$transaction(async (tx: any) => {
      // 1. Simpan data transaksi dengan userId
      const transaction = await tx.transaction.create({
        data: {
          amount: body.amount,
          type: body.type,
          description: body.description,
          date: body.date ? new Date(body.date) : new Date(),
          isSynced: false,
          userId: userId!,
          accountId: body.accountId,
          categoryId: body.categoryId?.trim() ? body.categoryId : undefined,
          toAccountId: body.toAccountId?.trim() ? body.toAccountId : undefined,
          adminFee: body.adminFee ?? 0,
        },
        include: {
          account: { select: { id: true, name: true, icon: true, color: true } },
          category: { select: { id: true, name: true, icon: true } },
          toAccount: { select: { id: true, name: true, icon: true, color: true } },
        },
      });

      // 2. Update Saldo dengan logika Uang Goib
      const account = await tx.account.findUnique({ where: { id: body.accountId } });
      if (!account) throw new Error("Akun sumber tidak ditemukan");

      if (body.type === "INCOME") {
        if (account.uangGoib > 0) {
          if (body.amount > account.uangGoib) {
            await tx.account.update({ where: { id: body.accountId }, data: { uangGoib: 0, balance: { increment: body.amount - account.uangGoib } } });
          } else {
            await tx.account.update({ where: { id: body.accountId }, data: { uangGoib: { decrement: body.amount } } });
          }
        } else {
          await tx.account.update({ where: { id: body.accountId }, data: { balance: { increment: body.amount } } });
        }
      } else if (body.type === "EXPENSE") {
        const deductible = Math.min(body.amount, account.balance);
        const goibAddition = body.amount - deductible;
        await tx.account.update({ where: { id: body.accountId }, data: { balance: { decrement: deductible }, uangGoib: { increment: goibAddition } } });
      } else if (body.type === "TRANSFER" && body.toAccountId) {
        const totalOut = body.amount + (body.adminFee ?? 0);
        const deductible = Math.min(totalOut, account.balance);
        const goibAddition = totalOut - deductible;
        await tx.account.update({ where: { id: body.accountId }, data: { balance: { decrement: deductible }, uangGoib: { increment: goibAddition } } });

        const targetAccount = await tx.account.findUnique({ where: { id: body.toAccountId } });
        if (!targetAccount) throw new Error("Akun tujuan tidak ditemukan");

        if (targetAccount.uangGoib > 0) {
          if (body.amount > targetAccount.uangGoib) {
            await tx.account.update({ where: { id: body.toAccountId }, data: { uangGoib: 0, balance: { increment: body.amount - targetAccount.uangGoib } } });
          } else {
            await tx.account.update({ where: { id: body.toAccountId }, data: { uangGoib: { decrement: body.amount } } });
          }
        } else {
          await tx.account.update({ where: { id: body.toAccountId }, data: { balance: { increment: body.amount } } });
        }
      }

      return transaction;
    }, { maxWait: 10000, timeout: 20000 });

    return NextResponse.json({ success: true, data: result as TransactionData }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/transactions] Error:", error);
    return NextResponse.json({ success: false, error: "Gagal menyimpan transaksi" }, { status: 500 });
  }
}
