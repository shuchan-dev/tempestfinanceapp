"use client";

import useSWR from "swr";
import { formatCurrency } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus, TrendingDown, TrendingUp } from "lucide-react";

interface ComparisonItem {
  categoryId: string;
  categoryName: string;
  icon: string;
  currentMonth: number;
  previousMonth: number;
  changePercent: number;
  changeDirection: "UP" | "DOWN" | "SAME";
}

export function SpendingComparison() {
  const { data: res, isLoading } = useSWR("/api/analytics/comparison");
  const comparison = res?.data;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 mt-6 animate-pulse">
        <div className="h-5 w-48 bg-zinc-200 dark:bg-zinc-700 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!comparison) return null;

  const getMonthName = (monthStr: string) => {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString("id-ID", { month: "short", year: "numeric" });
  };

  const isTotalGood = comparison.totalCurrent < comparison.totalPrev;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 mt-6">
      <h3 className="mb-4 text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2" suppressHydrationWarning>
        <span className="text-xl">📊</span>
        Perbandingan: {getMonthName(comparison.previousMonth)} vs {getMonthName(comparison.currentMonth)}
      </h3>

      <div className="space-y-3">
        {comparison.categories.map((item: ComparisonItem) => {
          const isGood = item.changeDirection === "DOWN";
          const isBad = item.changeDirection === "UP";

          return (
            <div key={item.categoryId} className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-lg">
                  {item.icon}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.categoryName}</span>
                  <span className="text-[10px] text-zinc-500">
                    {formatCurrency(item.previousMonth)} → <span className="font-medium text-zinc-800 dark:text-zinc-300">{formatCurrency(item.currentMonth)}</span>
                  </span>
                </div>
              </div>
              
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md ${
                isGood ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : 
                isBad ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : 
                "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}>
                {item.changePercent > 0 ? "+" : ""}{item.changePercent}%
                {isGood ? <ArrowDown className="h-3 w-3" /> : isBad ? <ArrowUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-zinc-500">Total Pengeluaran</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(comparison.totalCurrent)}</span>
        </div>
        <div className={`flex items-center gap-1 text-sm font-bold ${isTotalGood ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}>
          {isTotalGood ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
          {comparison.totalChangePercent > 0 ? "+" : ""}{comparison.totalChangePercent}%
        </div>
      </div>
    </div>
  );
}
