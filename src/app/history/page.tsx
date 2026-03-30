"use client";

/**
 * /history — Riwayat Transaksi
 *
 * Fitur:
 * - Dual-View: List (default) ↔ Calendar View
 * - Filter by type & date
 * - Export CSV / PDF
 */

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  History, ArrowRightLeft, List, CalendarDays,
  Download, FileText, FileSpreadsheet,
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { id } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, formatRelativeDate, getTransactionColor, getTransactionSign, cn } from "@/lib/utils";
import { exportToCSV, exportToPDF } from "@/lib/export";
import type { TransactionData } from "@/types";

type ViewMode = "list" | "calendar";

export default function HistoryPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all tx (higher limit for history)
  const { data: res, isLoading } = useSWR<{ data: TransactionData[] }>(
    "/api/transactions?limit=100",
  );
  const allTransactions = res?.data ?? [];

  // ── Calendar View: build modifiers ─────────────────────────
  const { expenseDays, incomeDays, transferDays } = useMemo(() => {
    const expenseDays: Date[] = [];
    const incomeDays: Date[] = [];
    const transferDays: Date[] = [];
    for (const tx of allTransactions) {
      const d = new Date(tx.date);
      if (tx.type === "EXPENSE") expenseDays.push(d);
      else if (tx.type === "INCOME") incomeDays.push(d);
      else transferDays.push(d);
    }
    return { expenseDays, incomeDays, transferDays };
  }, [allTransactions]);

  // ── List View: filter by selected day (wenn calendar) ──────
  const displayedTransactions = useMemo(() => {
    if (view === "calendar" && selectedDay) {
      return allTransactions.filter((tx) => {
        const d = new Date(tx.date);
        return (
          d.getDate() === selectedDay.getDate() &&
          d.getMonth() === selectedDay.getMonth() &&
          d.getFullYear() === selectedDay.getFullYear()
        );
      });
    }
    return allTransactions;
  }, [allTransactions, view, selectedDay]);

  // ── Export ─────────────────────────────────────────────────
  const handleExport = async (format: "csv" | "pdf") => {
    if (!allTransactions.length) { toast.error("Tidak ada data untuk diekspor"); return; }
    setIsExporting(true);
    try {
      if (format === "csv") {
        exportToCSV(allTransactions);
        toast.success("File CSV berhasil diunduh!");
      } else {
        await exportToPDF(allTransactions);
        toast.success("File PDF berhasil diunduh!");
      }
    } catch (err) {
      toast.error("Gagal mengekspor data");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-32 min-h-screen">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md z-10 px-6 pt-10 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-500" />
            Riwayat
          </h1>

          {/* Export Dropdown */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("csv")}
              disabled={isExporting}
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-1.5"
              title="Export CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV
            </button>
            <button
              onClick={() => handleExport("pdf")}
              disabled={isExporting}
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-1.5"
              title="Export PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => { setView("list"); setSelectedDay(undefined); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all",
              view === "list"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
            )}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all",
              view === "calendar"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
            )}
          >
            <CalendarDays className="w-4 h-4" /> Kalender
          </button>
        </div>
      </header>

      {/* ── Calendar View ─────────────────────────────────────── */}
      {view === "calendar" && (
        <div className="px-4">
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm overflow-hidden">
            <style>{`
              .rdp-day_button { font-size: 13px; }
              .rdp-day_selected .rdp-day_button { background-color: #10b981 !important; color: white !important; }
              .day-has-expense::after, .day-has-income::after, .day-has-transfer::after {
                content: ''; display: block; width: 5px; height: 5px;
                border-radius: 50%; margin: 1px auto 0;
              }
              .day-has-expense::after { background-color: #f87171; }
              .day-has-income::after { background-color: #10b981; }
              .day-has-transfer::after { background-color: #60a5fa; }
            `}</style>
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              month={calendarMonth}
              onMonthChange={setCalendarMonth}
              locale={id}
              modifiers={{ hasExpense: expenseDays, hasIncome: incomeDays, hasTransfer: transferDays }}
              modifiersClassNames={{ hasExpense: "day-has-expense", hasIncome: "day-has-income", hasTransfer: "day-has-transfer" }}
              className="mx-auto"
            />
            {selectedDay && (
              <p className="text-center text-xs text-zinc-500 mt-2">
                Menampilkan transaksi {formatDate(selectedDay)} —{" "}
                <button onClick={() => setSelectedDay(undefined)} className="underline text-emerald-500">tampilkan semua</button>
              </p>
            )}

            {/* Legenda */}
            <div className="flex justify-center gap-4 mt-3">
              {[{ color: "bg-emerald-400", label: "Income" }, { color: "bg-red-400", label: "Expense" }, { color: "bg-blue-400", label: "Transfer" }].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                  <span className="text-[11px] text-zinc-500">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction List ──────────────────────────────────── */}
      <div className="flex flex-col gap-2 px-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
        ) : displayedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <History className="h-14 w-14 text-zinc-200 dark:text-zinc-700 mb-3" />
            <p className="font-semibold text-zinc-400">
              {selectedDay ? `Tidak ada transaksi pada ${formatDate(selectedDay)}` : "Belum ada transaksi"}
            </p>
          </div>
        ) : (
          displayedTransactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
              {/* Left */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xl shrink-0">
                  {tx.type === "TRANSFER" ? (
                    <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                  ) : (
                    tx.category?.icon || "💵"
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight">
                    {tx.type === "TRANSFER" ? "Transfer Saldo" : tx.category?.name || "Tanpa Kategori"}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 leading-tight mt-0.5">
                    {tx.account?.name}
                    {tx.toAccount ? ` → ${tx.toAccount.name}` : ""}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                    {formatRelativeDate(tx.date)}
                  </span>
                </div>
              </div>

              {/* Right */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`font-bold tracking-tight ${getTransactionColor(tx.type)}`}>
                  {getTransactionSign(tx.type)} {formatCurrency(tx.amount)}
                </span>

                {tx.type === "TRANSFER" && tx.adminFee && tx.adminFee > 0 && (
                  <span className="text-[10px] font-semibold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                    + Admin {formatCurrency(tx.adminFee)}
                  </span>
                )}

                {tx.description && (
                  <span className="text-[10px] text-zinc-400 max-w-[110px] truncate" title={tx.description}>
                    {tx.description}
                  </span>
                )}

                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 mt-0.5">
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
