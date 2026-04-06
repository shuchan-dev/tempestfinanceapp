"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  formatCurrency,
  formatRelativeDate,
  getTransactionColor,
  getTransactionSign,
} from "@/lib/utils";
import { TransactionForm } from "@/components/transaction-form";
import { BudgetAlertBanner } from "@/components/budget-alert-banner";
import { GoalCard } from "@/components/goal-card";
import { GoalForm } from "@/components/goal-form";
import { PageContainer } from "@/components/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, AlertCircle, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import type { BudgetStatus } from "@/lib/budget-checker";
import type { GoalData } from "@/types";

export default function Dashboard() {
  const { accounts, transactions, totalBalance, accountsLoading, txLoading } =
    useDashboardData();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );

  // Fetch budget alerts
  const { data: budgetRes } = useSWR<{
    success: boolean;
    data: BudgetStatus[];
  }>("/api/budgets/status");
  const budgetAlerts = budgetRes?.data ?? [];

  // Fetch goals
  const { data: goalsRes } = useSWR<{
    success: boolean;
    data: GoalData[];
  }>("/api/goals");
  const goals = goalsRes?.data ?? [];

  // Filter out dismissed alerts
  const visibleAlerts = useMemo(
    () =>
      budgetAlerts.filter((alert) => !dismissedAlerts.has(alert.categoryId)),
    [budgetAlerts, dismissedAlerts],
  );

  const handleDismissAlert = (categoryId: string) => {
    setDismissedAlerts((prev) => new Set([...prev, categoryId]));
  };
  return (
    <PageContainer>
      {/* Budget Alerts Section */}
      {visibleAlerts.length > 0 && (
        <section className="space-y-2">
          {visibleAlerts.map((alert) => (
            <BudgetAlertBanner
              key={alert.categoryId}
              categoryName={alert.categoryName}
              categoryIcon={alert.categoryIcon}
              percentage={alert.percentage}
              spent={alert.spent}
              budget={alert.budgetAmount}
              isExceeded={alert.isExceeded}
              onDismiss={() => handleDismissAlert(alert.categoryId)}
            />
          ))}
        </section>
      )}

      {/* Header section (Total Balance) */}
      <header className="space-y-2">
        <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
          Total Saldo
        </h2>
        {accountsLoading ? (
          <Skeleton className="h-12 w-48 rounded-lg" />
        ) : (
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatCurrency(totalBalance)}
          </h1>
        )}
      </header>

      {/* Accounts Horizontal Scroll */}
      <section className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {accountsLoading ? (
          [1, 2].map((i) => (
            <Skeleton
              key={i}
              className="h-32 w-48 min-w-48 rounded-2xl shrink-0"
            />
          ))
        ) : accounts.length === 0 ? (
          <div className="flex h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <AlertCircle className="h-6 w-6 text-zinc-400 mb-2" />
            <p className="text-sm text-zinc-500">Belum ada akun</p>
          </div>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex h-32 min-w-48 flex-col justify-between rounded-2xl bg-zinc-900 p-5 shadow-md snap-center dark:bg-zinc-800"
              style={{
                backgroundColor: acc.color ? `${acc.color}20` : undefined,
                border: acc.color ? `1px solid ${acc.color}40` : undefined,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{acc.icon || "💳"}</span>
                <span className="font-semibold text-white/90 truncate">
                  {acc.name}
                </span>
              </div>
              <div className="flex flex-col mt-auto gap-0">
                <span className="text-xl font-bold tracking-tight text-white mb-1">
                  {formatCurrency(
                    acc.balance +
                      (acc.children?.reduce((s, c) => s + c.balance, 0) || 0),
                  )}
                </span>
                {acc.children && acc.children.length > 0 && (
                  <span className="text-[10px] font-medium text-white/70 bg-white/10 px-2 py-0.5 rounded-md w-max border border-white/5">
                    {acc.children.length} Kantong
                  </span>
                )}
                {acc.uangGoib > 0 && (
                  <span className="text-[12px] font-bold text-red-400 bg-red-950/40 px-2 py-0.5 rounded-full w-max mt-1.5">
                    Uang goib: {formatCurrency(acc.uangGoib)}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </section>

      {/* Goals Section */}
      <section className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Goals
          </h3>
          <GoalForm>
            <span className="text-sm text-indigo-500 font-medium cursor-pointer hover:text-indigo-600">
              + Tambah
            </span>
          </GoalForm>
        </div>

        {goals.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-50 rounded-2xl dark:bg-zinc-900/50">
            <span className="text-4xl mb-3">🎯</span>
            <p className="text-zinc-500 font-medium">Belum ada goal</p>
            <p className="text-sm text-zinc-400 mt-1">
              Buat goal untuk memotivasi diri
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Transactions */}
      <section className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Riwayat Terakhir
          </h3>
          <Link href="/history">
            <span className="text-sm text-emerald-500 font-medium">
              Lihat Semua
            </span>
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {txLoading ? (
            [1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-zinc-50 rounded-2xl dark:bg-zinc-900/50">
              <Receipt className="h-12 w-12 text-zinc-300 mb-3" />
              <p className="text-zinc-500 font-medium">Belum ada transaksi</p>
              <p className="text-sm text-zinc-400">
                Tekan tombol (+) untuk mulai
              </p>
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-white shadow-sm border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800"
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
                      {tx.toAccount ? `→ ${tx.toAccount.name}` : ""} •{" "}
                      {formatRelativeDate(tx.date)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`font-bold tracking-tight ${getTransactionColor(tx.type)}`}
                  >
                    {getTransactionSign(tx.type)} {formatCurrency(tx.amount)}
                  </span>
                  {/* Biaya Admin Transfer */}
                  {tx.type === "TRANSFER" && tx.adminFee && tx.adminFee > 0 && (
                    <span className="text-[10px] font-semibold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">
                      + Admin {formatCurrency(tx.adminFee)}
                    </span>
                  )}
                  {/* Status Indicator (⏳ pending vs ✅ synced) */}
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                    {tx.isSynced ? "✅ Synced" : "⏳ Pending"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Floating Action Button Setup */}
      <div className="fixed bottom-24 right-6 z-50 md:bottom-10">
        <TransactionForm />
      </div>
    </PageContainer>
  );
}
