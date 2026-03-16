/**
 * API Route: /api/seed
 *
 * POST — Isi database dengan data awal (akun & kategori default).
 * Kegunaan: Setup pertama kali agar dashboard tidak kosong.
 *
 * PENTING: Route ini sekarang mengaitkan semua data seed ke userId yang sedang login.
 * Diproteksi: cek apakah data sudah ada sebelum insert.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserId } from "@/lib/session";
import type { ApiResponse } from "@/types";

/** Data akun default */
const DEFAULT_ACCOUNTS = [
  { name: "Dompet Tunai", balance: 0, icon: "💵", color: "#22c55e" },
  { name: "Bank BCA", balance: 0, icon: "🏦", color: "#3b82f6" },
  { name: "GoPay", balance: 0, icon: "💚", color: "#16a34a" },
];

/** Kategori default */
const DEFAULT_CATEGORIES = [
  { name: "Makanan & Minuman", type: "EXPENSE", icon: "🍜" },
  { name: "Transportasi", type: "EXPENSE", icon: "🚗" },
  { name: "Belanja", type: "EXPENSE", icon: "🛒" },
  { name: "Tagihan & Utilitas", type: "EXPENSE", icon: "💡" },
  { name: "Hiburan", type: "EXPENSE", icon: "🎮" },
  { name: "Kesehatan", type: "EXPENSE", icon: "🏥" },
  { name: "Pendidikan", type: "EXPENSE", icon: "📚" },
  { name: "Lain-lain", type: "EXPENSE", icon: "📦" },
  { name: "Gaji", type: "INCOME", icon: "💰" },
  { name: "Freelance", type: "INCOME", icon: "💻" },
  { name: "Investasi", type: "INCOME", icon: "📈" },
  { name: "Hadiah", type: "INCOME", icon: "🎁" },
];

// ─── POST /api/seed ───────────────────────────────────────────
export async function POST(): Promise<
  NextResponse<ApiResponse<{ accounts: number; categories: number }>>
> {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false as const, error: "Tidak terautentikasi" },
        { status: 401 }
      );
    }

    // Cek apakah data sudah ada untuk user ini (idempotent)
    const existingAccounts = await db.account.count({ where: { userId } });
    const existingCategories = await db.category.count({ where: { userId } });

    let accountsCreated = 0;
    let categoriesCreated = 0;

    if (existingAccounts === 0) {
      await db.account.createMany({
        data: DEFAULT_ACCOUNTS.map((a) => ({ ...a, userId })),
      });
      accountsCreated = DEFAULT_ACCOUNTS.length;
    }

    if (existingCategories === 0) {
      await db.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
      });
      categoriesCreated = DEFAULT_CATEGORIES.length;
    }

    return NextResponse.json({
      success: true,
      data: { accounts: accountsCreated, categories: categoriesCreated },
    });
  } catch (error) {
    console.error("[POST /api/seed] Error:", error);
    return NextResponse.json(
      { success: false as const, error: "Gagal menginisialisasi data awal" },
      { status: 500 }
    );
  }
}
