import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";

// GET /api/analytics/comparison?month=2026-04
// Membandingkan bulan yang diminta dengan bulan sebelumnya
export async function GET(req: NextRequest) {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const monthParam = req.nextUrl.searchParams.get("month"); // format: "2026-04"
    const now = new Date();

    // Parse bulan yang diminta
    let currentYear: number, currentMonth: number;
    if (monthParam) {
      const [y, m] = monthParam.split("-").map(Number);
      currentYear = y;
      currentMonth = m;
    } else {
      currentYear = now.getFullYear();
      currentMonth = now.getMonth() + 1; // 1-indexed
    }

    // Hitung bulan sebelumnya
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    // Batas waktu bulan ini
    const currentStart = new Date(currentYear, currentMonth - 1, 1);
    const currentEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Batas waktu bulan lalu
    const prevStart = new Date(prevYear, prevMonth - 1, 1);
    const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);

    // Ambil transaksi EXPENSE bulan ini
    const currentTxs = await db.transaction.findMany({
      where: {
        userId: userId!,
        type: "EXPENSE",
        deletedAt: null,
        date: { gte: currentStart, lte: currentEnd },
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    // Ambil transaksi EXPENSE bulan lalu
    const prevTxs = await db.transaction.findMany({
      where: {
        userId: userId!,
        type: "EXPENSE",
        deletedAt: null,
        date: { gte: prevStart, lte: prevEnd },
      },
      include: {
        category: { select: { id: true, name: true, icon: true } },
      },
    });

    // Kelompokkan per kategori
    const groupByCategory = (txs: typeof currentTxs) => {
      const map: Record<
        string,
        { categoryId: string; categoryName: string; icon: string; total: number }
      > = {};

      for (const tx of txs) {
        const catId = tx.categoryId || "uncategorized";
        const catName = tx.category?.name || "Tanpa Kategori";
        const catIcon = tx.category?.icon || "💸";

        if (!map[catId]) {
          map[catId] = {
            categoryId: catId,
            categoryName: catName,
            icon: catIcon,
            total: 0,
          };
        }
        map[catId].total += tx.amount;
      }
      return map;
    };

    const currentByCategory = groupByCategory(currentTxs);
    const prevByCategory = groupByCategory(prevTxs);

    // Gabungkan dan hitung perubahan
    const allCategoryIds = new Set([
      ...Object.keys(currentByCategory),
      ...Object.keys(prevByCategory),
    ]);

    const comparison = Array.from(allCategoryIds).map((catId) => {
      const current = currentByCategory[catId];
      const prev = prevByCategory[catId];

      const currentTotal = current?.total || 0;
      const prevTotal = prev?.total || 0;

      const change =
        prevTotal > 0
          ? ((currentTotal - prevTotal) / prevTotal) * 100
          : currentTotal > 0
          ? 100
          : 0;

      return {
        categoryId: catId,
        categoryName: current?.categoryName || prev?.categoryName || "Unknown",
        icon: current?.icon || prev?.icon || "💸",
        currentMonth: currentTotal,
        previousMonth: prevTotal,
        changePercent: Math.round(change * 10) / 10, // 1 decimal
        changeDirection:
          currentTotal > prevTotal
            ? ("UP" as const)
            : currentTotal < prevTotal
            ? ("DOWN" as const)
            : ("SAME" as const),
      };
    });

    // Sort by current month total (descending)
    comparison.sort((a, b) => b.currentMonth - a.currentMonth);

    const totalCurrent = Object.values(currentByCategory).reduce(
      (s, c) => s + c.total,
      0,
    );
    const totalPrev = Object.values(prevByCategory).reduce(
      (s, c) => s + c.total,
      0,
    );

    return NextResponse.json({
      success: true,
      data: {
        currentMonth: `${currentYear}-${String(currentMonth).padStart(2, "0")}`,
        previousMonth: `${prevYear}-${String(prevMonth).padStart(2, "0")}`,
        totalCurrent,
        totalPrev,
        totalChangePercent:
          totalPrev > 0
            ? Math.round(((totalCurrent - totalPrev) / totalPrev) * 1000) / 10
            : 0,
        categories: comparison,
      },
    });
  } catch (error) {
    console.error("[GET /api/analytics/comparison] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data perbandingan pengeluaran" },
      { status: 500 },
    );
  }
}
