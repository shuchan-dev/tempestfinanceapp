"use client";

import useSWR from "swr";
import Link from "next/link";
import { AlertCircle, CalendarClock } from "lucide-react";
import type { DebtData } from "@/types";

export function DebtReminderBanner() {
  const { data: res } = useSWR<{ success: boolean; data: DebtData[] }>(
    "/api/debts/upcoming",
  );

  const debts = res?.data || [];

  if (debts.length === 0) return null;

  return (
    <Link href="/debts" className="block mt-2">
      <div className="flex items-center gap-3 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 p-4 shadow-sm transition-all hover:bg-orange-100 dark:hover:bg-orange-900/40">
        <div className="flex shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900 h-10 w-10 text-orange-600 dark:text-orange-400">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-orange-900 dark:text-orange-100 truncate">
            {debts.length} Hutang/Piutang Jatuh Tempo
          </h3>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-0.5 truncate">
            Periksa halaman debts untuk detailnya.
          </p>
        </div>
        <div className="shrink-0 flex items-center justify-center">
          <span className="text-orange-600 font-medium text-xs">Lihat &rarr;</span>
        </div>
      </div>
    </Link>
  );
}
