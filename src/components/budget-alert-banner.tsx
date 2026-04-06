/**
 * BudgetAlertBanner — Show warnings when budget is near or exceeded
 */

"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

export interface BudgetAlertBannerProps {
  categoryName: string;
  categoryIcon?: string;
  percentage: number;
  spent: number;
  budget: number;
  isExceeded: boolean;
  onDismiss?: () => void;
}

export function BudgetAlertBanner({
  categoryName,
  categoryIcon,
  percentage,
  spent,
  budget,
  isExceeded,
  onDismiss,
}: BudgetAlertBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-2xl border-l-4 shadow-sm",
        isExceeded
          ? "bg-red-50 dark:bg-red-950/20 border-red-400 dark:border-red-700"
          : "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-400 dark:border-yellow-700",
      )}
    >
      <AlertCircle
        className={cn(
          "h-5 w-5 shrink-0",
          isExceeded
            ? "text-red-600 dark:text-red-400"
            : "text-yellow-600 dark:text-yellow-400",
        )}
      />

      <div className="flex-1">
        <p
          className={cn(
            "text-sm font-semibold",
            isExceeded
              ? "text-red-900 dark:text-red-200"
              : "text-yellow-900 dark:text-yellow-200",
          )}
        >
          {isExceeded ? "🔴 Budget Terlampaui" : "⚠️ Budget Mendekati Batas"}
        </p>
        <p
          className={cn(
            "text-xs mt-1",
            isExceeded
              ? "text-red-800 dark:text-red-300"
              : "text-yellow-800 dark:text-yellow-300",
          )}
        >
          {categoryIcon} {categoryName} sudah menggunakan{" "}
          <span className="font-bold">{percentage.toFixed(0)}%</span> dari
          budget <span className="font-bold">{formatCurrency(budget)}</span>.
          Pengeluaran:{" "}
          <span className="font-bold">{formatCurrency(spent)}</span>
        </p>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0",
            isExceeded
              ? "bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-300 hover:bg-red-300 dark:hover:bg-red-900"
              : "bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-300 dark:hover:bg-yellow-900",
          )}
        >
          Tutup
        </button>
      )}
    </div>
  );
}
