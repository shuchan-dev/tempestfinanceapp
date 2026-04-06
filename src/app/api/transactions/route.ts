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
import { resolveUserId } from "@/lib/api-utils";
import type {
  CreateTransactionPayload,
  ApiResponse,
  TransactionData,
} from "@/types";
import { createTransaction } from "@/services/transactionService";

// ─── GET /api/transactions ────────────────────────────────────
/**
 * Mengambil daftar transaksi milik user aktif, diurutkan terbaru di atas.
 * Query params: ?limit=20&page=1&type=EXPENSE&accountId=xxx&categoryId=xxx
 *              &search=text&amountMin=N&amountMax=M&dateFrom=ISO&dateTo=ISO
 */
export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<TransactionData[]>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const page = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
    const type = searchParams.get("type");
    const accountId = searchParams.get("accountId");
    const categoryId = searchParams.get("categoryId");
    const search = searchParams.get("search");
    const amountMin = searchParams.get("amountMin");
    const amountMax = searchParams.get("amountMax");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const tag = searchParams.get("tag");

    // Build complex where clause for search
    const where: any = {
      userId: userId!,
      deletedAt: null,
      ...(type && { type }),
      ...(accountId && { accountId }),
      ...(categoryId && { categoryId }),
      ...(tag ? { tags: { contains: tag } } : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
      ...(amountMin || amountMax
        ? {
            amount: {
              ...(amountMin && { gte: parseFloat(amountMin) }),
              ...(amountMax && { lte: parseFloat(amountMax) }),
            },
          }
        : {}),
    };

    // For search, we need to handle OR conditions with description or category name
    // Since Prisma OR with related fields is complex, fetch all and filter in JS
    // BUT for better performance, filter by category name if search is provided
    let transactions = await db.transaction.findMany({
      where,
      include: {
        account: { select: { id: true, name: true, icon: true, color: true } },
        category: { select: { id: true, name: true, icon: true } },
        toAccount: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
      orderBy: { date: "desc" },
      take: limit * 3, // Fetch more to account for client-side filtering
    });

    // Client-side search filtering (description + category name)
    if (search) {
      const searchLower = search.toLowerCase();
      transactions = transactions.filter((tx) => {
        const description = (tx.description || "").toLowerCase();
        const categoryName = (tx.category?.name || "").toLowerCase();
        return (
          description.includes(searchLower) ||
          categoryName.includes(searchLower)
        );
      });
    }

    // Apply pagination after filtering
    const paginatedTransactions = transactions.slice(
      (page - 1) * limit,
      page * limit,
    );

    return NextResponse.json({
      success: true,
      data: paginatedTransactions as TransactionData[],
    });
  } catch (error) {
    console.error("[GET /api/transactions] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data transaksi" },
      { status: 500 },
    );
  }
}

// ─── POST /api/transactions ───────────────────────────────────
/**
 * Menyimpan transaksi baru secara atomik (Prisma $transaction).
 * Validasi kepemilikan akun dilakukan sebelum eksekusi untuk mencegah IDOR.
 */
export async function POST(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<TransactionData>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const body: CreateTransactionPayload = await req.json();

    // ── Validasi Input ─────────────────────────────────────
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Nominal harus lebih dari 0" },
        { status: 400 },
      );
    }
    if (!body.accountId) {
      return NextResponse.json(
        { success: false, error: "Akun wajib dipilih" },
        { status: 400 },
      );
    }
    if (!["INCOME", "EXPENSE", "TRANSFER"].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: "Tipe transaksi tidak valid" },
        { status: 400 },
      );
    }
    if (body.type === "TRANSFER" && !body.toAccountId) {
      return NextResponse.json(
        { success: false, error: "Akun tujuan wajib dipilih untuk Transfer" },
        { status: 400 },
      );
    }
    if (body.type === "TRANSFER" && body.accountId === body.toAccountId) {
      return NextResponse.json(
        { success: false, error: "Akun asal dan tujuan tidak boleh sama" },
        { status: 400 },
      );
    }

    // ── Validasi Kepemilikan Akun (Anti-IDOR) ──────────────
    // Pastikan accountId milik user yang sedang login
    const sourceAccount = await db.account.findFirst({
      where: { id: body.accountId, userId: userId! },
    });
    if (!sourceAccount) {
      return NextResponse.json(
        {
          success: false,
          error: "Akun sumber tidak valid atau bukan milik Anda",
        },
        { status: 403 },
      );
    }
    // Untuk TRANSFER, pastikan toAccountId juga milik user yang sama
    if (body.type === "TRANSFER" && body.toAccountId) {
      const destAccount = await db.account.findFirst({
        where: { id: body.toAccountId, userId: userId! },
      });
      if (!destAccount) {
        return NextResponse.json(
          {
            success: false,
            error: "Akun tujuan tidak valid atau bukan milik Anda",
          },
          { status: 403 },
        );
      }
    }

    // ── Operasi Atomik via Prisma $transaction ditarik ke Service Layer ─────────────
    const result = await createTransaction(userId!, body);

    return NextResponse.json(
      { success: true, data: result as TransactionData },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/transactions] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menyimpan transaksi" },
      { status: 500 },
    );
  }
}
