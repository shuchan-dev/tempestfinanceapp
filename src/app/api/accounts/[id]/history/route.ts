import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import { eachDayOfInterval, format } from "date-fns";

// GET /api/accounts/:id/history?days=30
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { id: accountId } = await params;
    const days = Number(req.nextUrl.searchParams.get("days") || "30");

    // Verifikasi akun milik user
    const account = await db.account.findFirst({
      where: { id: accountId, userId: userId! },
    });

    if (!account) {
      return NextResponse.json({ success: false, error: "Akun tidak ditemukan" }, { status: 404 });
    }

    // Ambil semua transaksi akun ini dalam N hari terakhir
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const transactions = await db.transaction.findMany({
      where: {
        userId: userId!,
        deletedAt: null,
        date: { gte: startDate },
        OR: [
          { accountId: accountId },
          { toAccountId: accountId },
        ],
      },
      orderBy: { date: "asc" },
      select: {
        amount: true,
        type: true,
        date: true,
        accountId: true,
        toAccountId: true,
        adminFee: true,
      },
    });

    // Hitung saldo harian secara reverse calculation dari saldo sekarang
    // Metode: mulai dari saldo sekarang, hitung ke belakang
    const currentBalance = account.balance;

    // Kumpulkan per hari
    const dailyChanges: Record<string, number> = {};

    for (const tx of transactions) {
      const dateKey = new Date(tx.date).toISOString().split("T")[0];
      if (!dailyChanges[dateKey]) dailyChanges[dateKey] = 0;

      if (tx.accountId === accountId) {
        // Transaksi keluar dari akun ini
        if (tx.type === "EXPENSE") {
          dailyChanges[dateKey] -= tx.amount;
        } else if (tx.type === "INCOME") {
          dailyChanges[dateKey] += tx.amount;
        } else if (tx.type === "TRANSFER") {
          dailyChanges[dateKey] -= tx.amount;
          if (tx.adminFee) dailyChanges[dateKey] -= tx.adminFee;
        }
      }

      if (tx.toAccountId === accountId && tx.type === "TRANSFER") {
        // Transaksi masuk dari transfer akun lain
        dailyChanges[dateKey] += tx.amount;
      }
    }

    // Bangun timeline dari startDate sampai hari ini
    const history: Array<{ date: string; balance: number }> = [];

    const today = new Date();
    const allDates = eachDayOfInterval({ start: startDate, end: today }).map(
      (d) => format(d, "yyyy-MM-dd")
    );

    // Reverse calculation
    const totalChangesAfter: Record<string, number> = {};
    let cumulative = 0;
    
    for (let i = allDates.length - 1; i >= 0; i--) {
      const dateKey = allDates[i];
      if (i < allDates.length - 1) {
        // Kurangi perubahan hari setelahnya
        const nextDate = allDates[i + 1];
        cumulative += dailyChanges[nextDate] || 0;
      }
      totalChangesAfter[dateKey] = cumulative;
    }

    for (const dateKey of allDates) {
      history.push({
        date: dateKey,
        balance: currentBalance - totalChangesAfter[dateKey],
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        accountId,
        accountName: account.name,
        currentBalance,
        history,
      },
    });
  } catch (error) {
    console.error(`[GET /api/accounts/[id]/history] Error:`, error);
    return NextResponse.json({ success: false, error: "Gagal mengambil riwayat saldo" }, { status: 500 });
  }
}
