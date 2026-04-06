"use client";

import type { TopMerchant } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface TopMerchantsListProps {
  data: TopMerchant[];
}

export function TopMerchantsList({ data }: TopMerchantsListProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-400 text-sm">
        Belum ada data pedagang
      </div>
    );
  }

  // Calculate total for percentage
  const total = data.reduce((sum, m) => sum + m.amount, 0);

  return (
    <div className="space-y-3">
      {data.map((merchant, index) => {
        const percentage = (merchant.amount / total) * 100;
        return (
          <div
            key={merchant.description}
            className="flex items-center gap-3 p-3 rounded-xl  bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors"
          >
            {/* Rank */}
            <div className="shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">#{index + 1}</span>
            </div>

            {/* Merchant Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {merchant.description}
              </p>
              <p className="text-xs text-zinc-500">
                {merchant.count}x transaksi
              </p>
            </div>

            {/* Amount & Percentage */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {formatCurrency(merchant.amount)}
              </span>
              <div className="flex items-center gap-1">
                <div className="h-1.5 w-16 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-8 text-right">
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
