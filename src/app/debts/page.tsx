"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  HandCoins, Plus, Loader2, CheckCircle2, Circle,
  Trash2, AlertCircle, Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { DebtData, DebtType, DebtPaymentData } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DebtsPage() {
  const [activeTab, setActiveTab] = useState<DebtType>("PIUTANG");
  const [showPaid, setShowPaid] = useState(false);

  const { data: debtsRes, isLoading, mutate } = useSWR<{ data: DebtData[] }>(
    `/api/debts?type=${activeTab}${showPaid ? "" : "&isPaid=false"}`,
    fetcher,
  );
  const debts = debtsRes?.data ?? [];

  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ personName: "", amount: "", description: "", dueDate: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paidLoadingId, setPaidLoadingId] = useState<string | null>(null);

  const [addingPaymentId, setAddingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: "" });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const totalActive = debts.filter((d) => !d.isPaid).reduce((s, d) => {
    const totalPaid = d.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
    return s + (d.amount - totalPaid);
  }, 0);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setForm((f) => ({ ...f, amount: raw ? new Intl.NumberFormat("id-ID").format(Number(raw)) : "" }));
  };

  const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setPaymentForm((f) => ({ ...f, amount: raw ? new Intl.NumberFormat("id-ID").format(Number(raw)) : "" }));
  };

  const handleAddPayment = async (e: React.FormEvent, debtId: string, remaining: number) => {
    e.preventDefault();
    const numericAmount = Number(paymentForm.amount.replace(/[^0-9]/g, ""));
    if (!numericAmount) { toast.error("Nominal harus diisi!"); return; }
    if (numericAmount > remaining) { toast.error("Nominal melebihi sisa hutang/piutang!"); return; }

    setIsSubmittingPayment(true);
    try {
      const res = await fetch("/api/debts/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          debtId,
          amount: numericAmount,
          date: paymentForm.date || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Realisasi pembayaran berhasil dicatat!");
        setAddingPaymentId(null);
        setPaymentForm({ amount: "", date: "" });
        mutate();
      } else {
        toast.error(data.error);
      }
    } catch { toast.error("Masalah jaringan"); }
    finally { setIsSubmittingPayment(false); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.personName.trim()) { toast.error("Nama orang wajib diisi!"); return; }
    const numericAmount = Number(form.amount.replace(/[^0-9]/g, ""));
    if (!numericAmount) { toast.error("Nominal harus diisi!"); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeTab,
          personName: form.personName.trim(),
          amount: numericAmount,
          description: form.description || undefined,
          dueDate: form.dueDate || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Catatan berhasil disimpan!");
        setIsAdding(false);
        setForm({ personName: "", amount: "", description: "", dueDate: "" });
        mutate();
      } else {
        toast.error(data.error);
      }
    } catch { toast.error("Masalah jaringan"); }
    finally { setIsSubmitting(false); }
  };

  const handleTogglePaid = async (id: string, isPaid: boolean) => {
    setPaidLoadingId(id);
    try {
      const res = await fetch(`/api/debts?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !isPaid }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(!isPaid ? "✅ Ditandai lunas!" : "Dibatalkan");
        mutate();
      } else toast.error(data.error);
    } catch { toast.error("Masalah jaringan"); }
    finally { setPaidLoadingId(null); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/debts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success("Catatan dihapus"); mutate(); }
      else toast.error(data.error);
    } catch { toast.error("Masalah jaringan"); }
  };

  return (
    <div className="flex flex-col gap-6 p-6 pt-10 pb-32 min-h-screen">
      {/* Header */}
      <header className="space-y-1 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md pb-4 z-10 -mx-6 px-6 pt-4 border-b border-zinc-100 dark:border-zinc-800">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <HandCoins className="w-6 h-6 text-emerald-500" />
          Hutang & Piutang
        </h1>
        <p className="text-sm text-zinc-500">Lacak uang yang dipinjam dan yang dipinjamkan</p>
      </header>

      {/* Tabs */}
      <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        {(["PIUTANG", "HUTANG"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setActiveTab(t); setIsAdding(false); }}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-semibold transition-all",
              activeTab === t
                ? t === "PIUTANG"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "bg-red-500 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
            )}
          >
            {t === "PIUTANG" ? "💚 Piutang (Orang Hutang ke Saya)" : "❤️ Hutang Saya"}
          </button>
        ))}
      </div>

      {/* Total & toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase font-semibold">Total Aktif</p>
          <p className={cn("text-xl font-extrabold", activeTab === "PIUTANG" ? "text-emerald-500" : "text-red-500")}>
            {formatCurrency(totalActive)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPaid(!showPaid)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline underline-offset-2"
          >
            {showPaid ? "Sembunyikan lunas" : "Tampilkan lunas"}
          </button>
          {!isAdding && (
            <Button size="sm" onClick={() => setIsAdding(true)} className="rounded-full text-xs">
              <Plus className="w-3 h-3 mr-1" /> Catat Baru
            </Button>
          )}
        </div>
      </div>

      {/* Form tambah */}
      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3 shadow-sm">
          <h3 className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
            Catat {activeTab === "PIUTANG" ? "Piutang Baru" : "Hutang Baru"}
          </h3>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              {activeTab === "PIUTANG" ? "Nama Orang yang Berhutang" : "Nama Orang yang Kamu Hutangi"}
            </label>
            <Input value={form.personName} onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))}
              placeholder="Nama..." className="mt-1 rounded-xl" disabled={isSubmitting} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase">Nominal</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">Rp</span>
              <Input value={form.amount} onChange={handleAmountChange} inputMode="numeric"
                placeholder="0" className="pl-9 rounded-xl" disabled={isSubmitting} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase">Catatan (Opsional)</label>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Untuk apa..." className="mt-1 rounded-xl" disabled={isSubmitting} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Jatuh Tempo (Opsional)
            </label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="mt-1 rounded-xl" disabled={isSubmitting} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setIsAdding(false)} disabled={isSubmitting}>Batal</Button>
            <Button type="submit" className={cn("flex-1 rounded-xl", activeTab === "PIUTANG" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600")} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="flex flex-col gap-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
        ) : debts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <AlertCircle className="h-12 w-12 text-zinc-300 mb-3" />
            <p className="text-zinc-500 font-medium">Tidak ada catatan {activeTab.toLowerCase()}</p>
          </div>
        ) : (
          debts.map((debt) => {
            const isOverdue = debt.dueDate && !debt.isPaid && new Date(debt.dueDate) < new Date();
            const totalPaid = debt.payments?.reduce((acc, p) => acc + p.amount, 0) || 0;
            const remaining = debt.amount - totalPaid;

            return (
              <div
                key={debt.id}
                className={cn(
                  "p-4 rounded-2xl border shadow-sm transition-all flex flex-col gap-4",
                  debt.isPaid
                    ? "bg-zinc-50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800 opacity-60"
                    : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => handleTogglePaid(debt.id, debt.isPaid)}
                      disabled={paidLoadingId === debt.id}
                      className="mt-0.5 shrink-0"
                    >
                      {paidLoadingId === debt.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                      ) : debt.isPaid ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-zinc-300 hover:text-emerald-400 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-semibold text-zinc-900 dark:text-zinc-100", debt.isPaid && "line-through text-zinc-400")}>
                        {debt.personName}
                      </p>
                      {debt.description && (
                        <p className="text-xs text-zinc-500 truncate">{debt.description}</p>
                      )}
                      {debt.dueDate && (
                        <p className={cn("text-xs mt-0.5 font-medium", isOverdue ? "text-red-500" : "text-zinc-400")}>
                          {isOverdue ? "⚠️ Jatuh tempo: " : "📅 "}
                          {formatDate(debt.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn(
                      "font-bold text-base",
                      debt.isPaid ? "text-zinc-400" : activeTab === "PIUTANG" ? "text-emerald-500" : "text-red-500"
                    )}>
                      {formatCurrency(debt.amount)}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-300 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus catatan?</AlertDialogTitle>
                          <AlertDialogDescription>Catatan ini akan dihapus permanen.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(debt.id)} className="rounded-xl bg-red-500 hover:bg-red-600 text-white">Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {/* Progress Pembayaran & Form */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500">Telah dibayar: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatCurrency(totalPaid)}</span></span>
                    <span className="text-zinc-500">Sisa: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(remaining)}</span></span>
                  </div>

                  {debt.payments && debt.payments.length > 0 && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Riwayat Realisasi</p>
                      {debt.payments.map((p) => (
                        <div key={p.id} className="flex justify-between items-center text-xs">
                          <span className="text-zinc-500 font-medium">{formatDate(p.date)}</span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {!debt.isPaid && remaining > 0 && (
                    addingPaymentId === debt.id ? (
                      <form onSubmit={(e) => handleAddPayment(e, debt.id, remaining)} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-sm">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">Rp</span>
                            <Input autoFocus value={paymentForm.amount} onChange={handlePaymentAmountChange} className="pl-7 text-xs h-8 rounded-lg" placeholder="0" />
                          </div>
                          <Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm(f => ({...f, date: e.target.value}))} className="w-32 text-xs h-8 rounded-lg" />
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="sm" className="flex-1 h-8 text-xs rounded-lg" onClick={() => setAddingPaymentId(null)}>Batal</Button>
                          <Button type="submit" size="sm" className="flex-1 h-8 text-xs rounded-lg" disabled={isSubmittingPayment}>
                            {isSubmittingPayment ? <Loader2 className="w-3 h-3 animate-spin"/> : "Simpan"}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full text-xs rounded-xl h-8 text-zinc-600 dark:text-zinc-400" onClick={() => {
                        setAddingPaymentId(debt.id);
                        setPaymentForm({ amount: "", date: "" });
                      }}>
                        <Plus className="w-3 h-3 mr-1" /> Tambah Realisasi
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
