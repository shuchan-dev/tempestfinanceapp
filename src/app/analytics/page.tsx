"use client";

import useSWR, { useSWRConfig } from "swr";
import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Flame,
  TrendingDown,
  TrendingUp,
  ArrowUpDown,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { CashflowChart } from "@/components/cashflow-chart";
import { BudgetProgressCard } from "@/components/budget-progress-card";
import { CategoryPieChart } from "@/components/category-pie-chart";
import { TopMerchantsList } from "@/components/top-merchants-list";
import { SpendingComparison } from "@/components/spending-comparison";
import { PageContainer } from "@/components/page-container";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import type { AnalyticsData, CategoryData } from "@/types";

export default function AnalyticsPage() {
  const { data: overviewRes, isLoading: l1, mutate: m1 } = useSWR<{ success: boolean; data: any }>("/api/analytics/overview");
  const { data: cashflowRes, isLoading: l2, mutate: m2 } = useSWR<{ success: boolean; data: any[] }>("/api/analytics/cashflow");
  const { data: categoriesStatRes, isLoading: l3, mutate: m3 } = useSWR<{ success: boolean; data: any[] }>("/api/analytics/categories");
  const { data: merchantsRes, isLoading: l4, mutate: m4 } = useSWR<{ success: boolean; data: any[] }>("/api/analytics/merchants");
  const { data: budgetsRes, isLoading: l5, mutate: m5 } = useSWR<{ success: boolean; data: any[] }>("/api/analytics/budgets");

  const isLoading = l1 || l2 || l3 || l4 || l5;
  const mutate = () => { m1(); m2(); m3(); m4(); m5(); };
  const { data: categoriesRes } = useSWR<{ data: CategoryData[] }>(
    "/api/categories?type=EXPENSE",
  );

  const [isAddingBudget, setIsAddingBudget] = useState(false);
  const [budgetCategoryId, setBudgetCategoryId] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate: globalMutate } = useSWRConfig();

  const analytics = overviewRes ? {
    burnRate: overviewRes.data?.burnRate ?? 0,
    totalExpenseThisMonth: overviewRes.data?.totalExpenseThisMonth ?? 0,
    totalIncomeThisMonth: overviewRes.data?.totalIncomeThisMonth ?? 0,
    netFlowThisMonth: overviewRes.data?.netFlowThisMonth ?? 0,
    cashflow: cashflowRes?.data ?? [],
    categorySpending: categoriesStatRes?.data ?? [],
    topMerchants: merchantsRes?.data ?? [],
    budgetProgress: budgetsRes?.data ?? [],
  } : null;
  const categories = categoriesRes?.data ?? [];

  const handleBudgetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (!raw) {
      setBudgetAmount("");
      return;
    }
    setBudgetAmount(new Intl.NumberFormat("id-ID").format(Number(raw)));
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetCategoryId) {
      toast.error("Pilih kategori!");
      return;
    }
    const numericAmount = Number(budgetAmount.replace(/[^0-9]/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Nominal harus lebih dari 0!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: budgetCategoryId,
          amount: numericAmount,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Budget berhasil disimpan!");
        setIsAddingBudget(false);
        setBudgetCategoryId("");
        setBudgetAmount("");
        mutate();
      } else {
        toast.error(data.error || "Gagal menyimpan budget");
      }
    } catch {
      toast.error("Masalah jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    try {
      const res = await fetch(`/api/budgets?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Budget dihapus");
        mutate();
      } else toast.error(data.error);
    } catch {
      toast.error("Masalah jaringan");
    }
  };

  // Burn rate color
  const burnRateColor = analytics
    ? analytics.netFlowThisMonth < 0
      ? "text-red-500"
      : "text-emerald-500"
    : "text-zinc-400";

  return (
    <PageContainer className="min-h-screen">
      {/* Header */}
      <header className="space-y-1 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md pb-4 z-10 -mx-6 px-6 pt-4 border-b border-zinc-100 dark:border-zinc-800">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-500" />
          Analitik
        </h1>
        <p className="text-sm font-medium text-zinc-500">
          Statistik keuangan bulan ini
        </p>
      </header>

      {/* ── Stats Cards ─────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-3">
        {/* Burn Rate */}
        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 p-4 shadow-md">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              Monthly Burn Rate
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-40 mt-1" />
          ) : (
            <>
              <p className="text-2xl font-extrabold text-white">
                {formatCurrency(analytics?.burnRate ?? 0)}
                <span className="text-sm font-normal text-zinc-400">/hari</span>
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Berdasarkan {new Date().getDate()} hari yang sudah lewat bulan
                ini
              </p>
            </>
          )}
        </div>

        {/* Income bulan ini */}
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
              Masuk
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(analytics?.totalIncomeThisMonth ?? 0)}
            </p>
          )}
        </div>

        {/* Expense bulan ini */}
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-[11px] font-semibold text-red-500 uppercase">
              Keluar
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <p className="text-base font-bold text-red-500">
              {formatCurrency(analytics?.totalExpenseThisMonth ?? 0)}
            </p>
          )}
        </div>

        {/* Net Flow */}
        <div className="col-span-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
              Net Flow Bulan Ini
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-28" />
          ) : (
            <span className={`text-lg font-extrabold ${burnRateColor}`}>
              {(analytics?.netFlowThisMonth ?? 0) >= 0 ? "+" : ""}
              {formatCurrency(analytics?.netFlowThisMonth ?? 0)}
            </span>
          )}
        </div>
      </section>

      {/* ── Cashflow Chart ───────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Arus Kas 6 Bulan
        </h2>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
          {isLoading ? (
            <Skeleton className="h-52 w-full rounded-xl" />
          ) : (
            <CashflowChart data={analytics?.cashflow ?? []} />
          )}
        </div>
      </section>

      {/* ── Category Pie Chart ───────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Breakdown Kategori Bulan Ini
        </h2>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
          {isLoading ? (
            <Skeleton className="h-80 w-full rounded-xl" />
          ) : (
            <CategoryPieChart data={analytics?.categorySpending ?? []} />
          )}
        </div>
      </section>

      {/* ── Top Merchants ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          Top Pedagang/Toko
        </h2>
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-4 shadow-sm">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <TopMerchantsList data={analytics?.topMerchants ?? []} />
          )}
        </div>
      </section>

      {/* ── Budget Threshold ─────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Budget Bulanan
          </h2>
          {!isAddingBudget && (
            <Button
              size="sm"
              onClick={() => setIsAddingBudget(true)}
              className="rounded-full text-xs"
            >
              <Plus className="w-3 h-3 mr-1" /> Set Budget
            </Button>
          )}
        </div>

        {/* Form tambah budget */}
        {isAddingBudget && (
          <form
            onSubmit={handleAddBudget}
            className="bg-white dark:bg-zinc-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 p-4 space-y-3 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Set Budget Kategori
            </h3>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase">
                Kategori Pengeluaran
              </label>
              <select
                value={budgetCategoryId}
                onChange={(e) => setBudgetCategoryId(e.target.value)}
                className="w-full rounded-xl border-zinc-200 bg-zinc-50 p-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="" disabled>
                  Pilih kategori...
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase">
                Batas Maksimal/Bulan
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                  Rp
                </span>
                <Input
                  value={budgetAmount}
                  onChange={handleBudgetAmountChange}
                  inputMode="numeric"
                  placeholder="0"
                  className="pl-9 rounded-xl"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setIsAddingBudget(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Simpan"
                )}
              </Button>
            </div>
          </form>
        )}

        {/* List budget progress */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            [...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))
          ) : (analytics?.budgetProgress.length ?? 0) === 0 ? (
            <div className="relative overflow-hidden rounded-2xl p-6 transition-all duration-300 bg-linear-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-900/50 border border-zinc-100 dark:border-zinc-800 shadow-sm text-center py-8 text-zinc-400 text-sm border-dashed">
              Belum ada budget yang disetel. Tap &ldquo;Set Budget&rdquo; untuk
              mulai.
            </div>
          ) : (
            analytics?.budgetProgress.map((b) => (
              <BudgetProgressCard
                key={b.id}
                budget={b}
                onDelete={handleDeleteBudget}
              />
            ))
          )}
        </div>
      </section>

      {/* ── Spending Comparison ─────────────────────────────────── */}
      <section className="space-y-3 pb-8">
        <SpendingComparison />
      </section>

    </PageContainer>
  );
}
