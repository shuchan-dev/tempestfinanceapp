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
import useSWR, { useSWRConfig } from "swr";
import { History, ArrowRightLeft, List, CalendarDays } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { id } from "date-fns/locale";
import { PageContainer } from "@/components/page-container";
import { SearchInput } from "@/components/search-input";
import { FilterButton, type FilterState } from "@/components/filter-button";
import { TransactionActionsMenu } from "@/components/transaction-actions-menu";
import { TransactionForm } from "@/components/transaction-form";
import { ExportButton } from "@/components/export-button";
import { BulkActionMenu } from "@/components/bulk-action-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Square } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  getTransactionColor,
  getTransactionSign,
  cn,
} from "@/lib/utils";
import type { TransactionData } from "@/types";
import { Button } from "@/components/ui/button";

type ViewMode = "list" | "calendar";

export default function HistoryPage() {
  const { mutate } = useSWRConfig();
  const [view, setView] = useState<ViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [page, setPage] = useState(1);
  const limit = view === "list" ? 50 : 500;
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionData | null>(null);

  // Bulk Selection
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Build query string from filters and search
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append("limit", limit.toString());
    params.append("page", page.toString());
    if (searchQuery) params.append("search", searchQuery);
    if (filters.type) params.append("type", filters.type);
    if (filters.categoryId) params.append("categoryId", filters.categoryId);
    if (filters.accountId) params.append("accountId", filters.accountId);
    if (filters.amountMin)
      params.append("amountMin", filters.amountMin.toString());
    if (filters.amountMax)
      params.append("amountMax", filters.amountMax.toString());
    if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.append("dateTo", filters.dateTo);
    if ((filters as any).tag) params.append("tag", (filters as any).tag);
    return `/api/transactions?${params.toString()}`;
  };

  // Fetch all tx with filters and search applied
  const { data: res, isLoading } = useSWR<{ data: TransactionData[] }>(
    buildQueryString(),
  );
  const allTransactions = res?.data ?? [];

  // Fetch all transactions for categories/accounts (for filter dropdowns)
  const { data: allRes } = useSWR<{ data: TransactionData[] }>(
    "/api/transactions?limit=500",
  );
  const allTxns = allRes?.data ?? [];

  // Extract unique categories and accounts
  const categories = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>();
    for (const tx of allTxns) {
      if (tx.category) {
        map.set(tx.category.id, tx.category);
      }
    }
    return Array.from(map.values());
  }, [allTxns]);

  const accounts = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, any>();
    for (const tx of allTxns) {
      map.set(tx.account.id, tx.account);
    }
    return Array.from(map.values());
  }, [allTxns]);

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

  return (
    <PageContainer className="gap-4">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md z-10 px-6 pt-10 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-500" />
            Riwayat
          </h1>
        </div>

        {/* View Toggle */}
        <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => {
              setView("list");
              setSelectedDay(undefined);
              setPage(1);
            }}
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
            onClick={() => {
              setView("calendar");
              setPage(1);
            }}
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

      {/* Search & Filter Bar */}
      <div className="px-6 pb-4 border-b border-zinc-100 dark:border-zinc-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            {displayedTransactions.length} transaksi
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsSelecting(!isSelecting);
                if (isSelecting) setSelectedIds([]);
              }}
              className={cn(
                "text-sm font-medium px-3 py-1.5 rounded-lg transition-colors border",
                isSelecting
                  ? "bg-zinc-100 text-zinc-900 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-700"
                  : "bg-transparent text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20"
              )}
            >
              {isSelecting ? "Batal" : "Pilih"}
            </button>
            {displayedTransactions.length > 0 && !isSelecting && (
              <ExportButton transactions={displayedTransactions} />
            )}
          </div>
        </div>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Cari deskripsi, kategori..."
          className="mb-3"
        />
        <FilterButton
          activeFilters={filters}
          onFilterChange={setFilters}
          categories={categories}
          accounts={accounts}
        />
        {(filters as any).tag && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md flex items-center gap-1 dark:bg-indigo-900/50 dark:text-indigo-300">
              #{(filters as any).tag}
              <button onClick={() => {
                const newFilters = { ...filters };
                delete (newFilters as any).tag;
                setFilters(newFilters);
              }} className="ml-1 text-indigo-400 hover:text-indigo-600">✕</button>
            </span>
          </div>
        )}
      </div>

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
              modifiers={{
                hasExpense: expenseDays,
                hasIncome: incomeDays,
                hasTransfer: transferDays,
              }}
              modifiersClassNames={{
                hasExpense: "day-has-expense",
                hasIncome: "day-has-income",
                hasTransfer: "day-has-transfer",
              }}
              className="mx-auto"
            />
            {selectedDay && (
              <p className="text-center text-xs text-zinc-500 mt-2">
                Menampilkan transaksi {formatDate(selectedDay)} —{" "}
                <button
                  onClick={() => setSelectedDay(undefined)}
                  className="underline text-emerald-500"
                >
                  tampilkan semua
                </button>
              </p>
            )}

            {/* Legenda */}
            <div className="flex justify-center gap-4 mt-3">
              {[
                { color: "bg-emerald-400", label: "Income" },
                { color: "bg-red-400", label: "Expense" },
                { color: "bg-blue-400", label: "Transfer" },
              ].map((l) => (
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
          [...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))
        ) : displayedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <History className="h-14 w-14 text-zinc-200 dark:text-zinc-700 mb-3" />
            <p className="font-semibold text-zinc-400">
              {selectedDay
                ? `Tidak ada transaksi pada ${formatDate(selectedDay)}`
                : "Belum ada transaksi"}
            </p>
          </div>
        ) : (
          displayedTransactions.map((tx) => {
            const isSelected = selectedIds.includes(tx.id);
            return (
              <div
                key={tx.id}
                onClick={() => {
                  if (isSelecting) {
                    setSelectedIds((prev) =>
                      prev.includes(tx.id) ? prev.filter((id) => id !== tx.id) : [...prev, tx.id]
                    );
                  }
                }}
                className={cn(
                  "flex items-center justify-between rounded-2xl p-4 shadow-sm transition-all relative",
                  isSelecting ? "cursor-pointer" : "",
                  isSelected
                    ? "bg-emerald-50 border-emerald-500 shadow-md ring-1 ring-emerald-500 dark:bg-emerald-900/20"
                    : "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
                )}
              >
                {/* Left */}
                <div className="flex items-center gap-3 flex-1">
                  {isSelecting ? (
                    <div className="shrink-0 mr-1 transition-all">
                      {isSelected ? (
                        <CheckSquare className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <Square className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
                      )}
                    </div>
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xl shrink-0">
                      {tx.type === "TRANSFER" ? (
                        <ArrowRightLeft className="h-5 w-5 text-blue-500" />
                      ) : (
                        tx.category?.icon || "💵"
                      )}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-tight flex items-center gap-1.5">
                      <span>
                        {tx.type === "TRANSFER"
                          ? "Transfer Saldo"
                          : tx.category?.name || "Tanpa Kategori"}
                      </span>
                      {(tx.isRecurring || tx.isRecurringInstance) && (
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 rounded-sm" title="Recurring Transaction">
                          🔄
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-medium text-zinc-500 leading-tight mt-0.5">
                      {tx.account?.name}
                      {tx.toAccount ? ` → ${tx.toAccount.name}` : ""}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                      {formatRelativeDate(tx.date)}
                    </span>
                    {tx.tags && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {tx.tags.split(",").map((tag) => (
                          <span
                            key={tag}
                            onClick={(e) => {
                              e.stopPropagation();
                              setFilters({ ...filters, tag: tag.trim() } as any);
                            }}
                            className="text-[9px] px-1.5 py-0.5 cursor-pointer rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 font-medium hover:opacity-80"
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`font-bold tracking-tight ${getTransactionColor(tx.type)}`}
                    >
                      {getTransactionSign(tx.type)} {formatCurrency(tx.amount)}
                    </span>

                    {tx.type === "TRANSFER" && tx.adminFee && tx.adminFee > 0 && (
                      <span className="text-[10px] font-semibold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                        + Admin {formatCurrency(tx.adminFee)}
                      </span>
                    )}

                    {tx.description && (
                      <span
                        className="text-[10px] text-zinc-400 max-w-27.5 truncate"
                        title={tx.description}
                      >
                        {tx.description}
                      </span>
                    )}

                    <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 mt-0.5">
                      {tx.isSynced ? "✅ Synced" : "⏳ Pending"}
                    </span>
                  </div>

                  {/* Actions Menu */}
                  {!isSelecting && (
                    <TransactionActionsMenu
                      transactionId={tx.id}
                      onEdit={() => setEditingTransaction(tx)}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Controls */}
        {!isLoading && view === "list" && (
          <div className="flex items-center justify-center gap-4 mt-6 mb-4">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl px-6"
            >
              Sebelumnya
            </Button>
            <span className="text-sm font-medium text-zinc-500">Hal {page}</span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={displayedTransactions.length < limit}
              className="rounded-xl px-6"
            >
              Selanjutnya
            </Button>
          </div>
        )}
      </div>

      {/* Edit Transaction Modal */}
      <TransactionForm
        editTransaction={editingTransaction}
        onSuccess={() => {
          setEditingTransaction(null);
          mutate(
            (key) =>
              typeof key === "string" && key.includes("/api/transactions"),
            undefined,
            { revalidate: true },
          );
        }}
      />

      {/* Bulk Action Menu */}
      {isSelecting && selectedIds.length > 0 && (
        <BulkActionMenu
          selectedIds={selectedIds}
          categories={categories}
          onClearSelection={() => {
            setSelectedIds([]);
            setIsSelecting(false);
          }}
          onSuccess={() => {
            mutate(
              (key) => typeof key === "string" && key.includes("/api/transactions"),
              undefined,
              { revalidate: true }
            );
          }}
        />
      )}
    </PageContainer>
  );
}
