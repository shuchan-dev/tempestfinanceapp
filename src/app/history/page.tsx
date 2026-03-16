"use client";

import useSWR from "swr";
import {
  formatCurrency,
  formatRelativeDate,
  getTransactionColor,
  getTransactionSign,
} from "@/lib/utils";
import type { TransactionData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRightLeft, Receipt, Calendar } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HistoryPage() {
  const { data: txRes, isLoading } = useSWR<{ data: TransactionData[] }>(
    "/api/transactions?limit=100",
    fetcher,
  );
  const transactions = txRes?.data || [];

  return (
    <div className="flex flex-col gap-6 p-6 pt-10 pb-32 min-h-screen">
      <header className="space-y-2 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md pb-4 z-10 -mx-6 px-6 pt-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-500" />
          Riwayat Transaksi
        </h1>
        <p className="text-sm font-medium text-zinc-500">
          Semua catatan keuangan Anda tersimpan offline.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-50 rounded-3xl border border-dashed border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800 mt-10">
            <Receipt className="h-16 w-16 text-zinc-300 mb-4" />
            <p className="text-zinc-600 font-medium dark:text-zinc-400">
              Belum ada riwayat transaksi
            </p>
            <p className="text-sm text-zinc-400 mt-1">
              Catat transaksi pertama Anda di Dashboard
            </p>
          </div>
        ) : (
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-white shadow-sm border border-zinc-100 hover:shadow-md transition-shadow dark:bg-zinc-900 dark:border-zinc-800"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-2xl">
                  {tx.type === "TRANSFER" ? (
                    <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                  ) : (
                    tx.category?.icon || "💵"
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {tx.type === "TRANSFER"
                      ? "Transfer Saldo"
                      : tx.category?.name || "Tanpa Kategori"}
                  </span>
                  <span className="text-xs font-medium text-zinc-500">
                    {tx.account?.name}{" "}
                    {tx.toAccount ? `→ ${tx.toAccount.name}` : ""}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                    {formatRelativeDate(tx.date)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`font-bold tracking-tight ${getTransactionColor(tx.type)}`}
                >
                  {getTransactionSign(tx.type)} {formatCurrency(tx.amount)}
                </span>

                {tx.description && (
                  <span
                    className="text-[10px] text-zinc-400 max-w-[100px] truncate"
                    title={tx.description}
                  >
                    `{tx.description}`
                  </span>
                )}

                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 mt-1">
                  {tx.isSynced ? "✅ Synced" : "⏳ Pending"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
