"use client";

/**
 * BudgetProgressCard — Kartu progress bar budget per kategori
 * Warna: Hijau (<60%) → Kuning (60-85%) → Merah (>85%) → Merah berkedip (>100%)
 */

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import type { BudgetData } from "@/types";

interface BudgetProgressCardProps {
  budget: BudgetData & { spent: number; percentage: number };
  onDelete?: (id: string) => void;
}

function getProgressColor(percentage: number): string {
  if (percentage >= 100) return "bg-red-500 animate-pulse";
  if (percentage >= 85) return "bg-red-500";
  if (percentage >= 60) return "bg-yellow-500";
  return "bg-emerald-500";
}

function getTextColor(percentage: number): string {
  if (percentage >= 85) return "text-red-500";
  if (percentage >= 60) return "text-yellow-500";
  return "text-emerald-500";
}

export function BudgetProgressCard({ budget, onDelete }: BudgetProgressCardProps) {
  const { spent, percentage, category, amount } = budget;
  const clampedPct = Math.min(percentage, 100);

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{category.icon || (category.type === "EXPENSE" ? "💸" : "💰")}</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{category.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-bold", getTextColor(percentage))}>
            {percentage}%
          </span>
          {onDelete && (
            <button
              onClick={() => onDelete(budget.id)}
              className="text-zinc-400 hover:text-red-500 transition-colors text-xs"
              aria-label="Hapus budget"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getProgressColor(percentage))}
          style={{ width: `${clampedPct}%` }}
        />
      </div>

      {/* Amount info */}
      <div className="flex justify-between text-xs text-zinc-500">
        <span>
          Terpakai: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(spent)}</span>
        </span>
        <span>
          Limit: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{formatCurrency(amount)}</span>
        </span>
      </div>

      {/* Warning if over budget */}
      {percentage > 100 && (
        <p className="text-[11px] font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-2 py-1 text-center">
          ⚠️ Over budget! Melebihi {formatCurrency(spent - amount)}
        </p>
      )}
    </div>
  );
}
