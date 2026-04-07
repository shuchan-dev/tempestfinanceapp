/**
 * RecurrenceSelect — UI for setting up recurring transactions
 */

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface RecurrenceConfig {
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  byMonthDay?: number; // For MONTHLY
  endDate?: string; // ISO date string
}

interface RecurrenceSelectProps {
  value: RecurrenceConfig | null;
  onChange: (config: RecurrenceConfig | null) => void;
}

export function RecurrenceSelect({ value, onChange }: RecurrenceSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleFrequencyChange = (freq: string) => {
    if (freq === "none") {
      onChange(null);
    } else {
      const newConfig: RecurrenceConfig = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        frequency: freq as any,
      };

      if (freq === "MONTHLY") {
        newConfig.byMonthDay = new Date().getDate();
      }

      onChange(newConfig);
    }
    setIsOpen(false);
  };

  const handleMonthDayChange = (day: number) => {
    if (value?.frequency === "MONTHLY") {
      onChange({
        ...value,
        byMonthDay: day,
      });
    }
  };

  const handleEndDateChange = (date: string) => {
    if (value) {
      onChange({
        ...value,
        endDate: date || undefined,
      });
    }
  };

  const frequencyLabels: Record<string, string> = {
    DAILY: "Setiap Hari",
    WEEKLY: "Setiap Minggu",
    MONTHLY: "Setiap Bulan",
    YEARLY: "Setiap Tahun",
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block">
        Pengulangan
      </label>

      {/* Frequency Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between text-sm transition-colors",
            value
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
              : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300",
          )}
        >
          <span>
            {value
              ? `🔄 ${frequencyLabels[value.frequency!]} ${value.endDate ? `(sampai ${value.endDate})` : ""}`
              : "Tidak diulang"}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 w-full z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden">
            <button
              type="button"
              onClick={() => handleFrequencyChange("none")}
              className="w-full px-4 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm"
            >
              Tidak diulang
            </button>
            {Object.entries(frequencyLabels).map(([key, label]) => (
              <button
                type="button"
                key={key}
                onClick={() => handleFrequencyChange(key)}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm transition-colors",
                  value?.frequency === key
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Additional Options */}
      {value && (
        <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
          {value.frequency === "MONTHLY" && (
            <div>
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400 block mb-1.5">
                Hari dalam Bulan
              </label>
              <Input
                type="number"
                min="1"
                max="31"
                value={value.byMonthDay || new Date().getDate()}
                onChange={(e) =>
                  handleMonthDayChange(
                    Math.min(31, Math.max(1, parseInt(e.target.value) || 1)),
                  )
                }
                className="h-8 text-xs"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-400 block mb-1.5">
              Tanggal Akhir (Opsional)
            </label>
            <Input
              type="date"
              value={value.endDate || ""}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            💡 Transaksi akan dibuat otomatis setiap periode sampai tanggal
            akhir.
          </p>
        </div>
      )}
    </div>
  );
}
