"use client";

import { useState, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { cn } from "@/lib/utils";
import type { AccountData, CategoryData, TransactionData, TransactionType } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// fetcher tidak perlu didefinisikan lokal — sudah di-provide global oleh SWRProvider di layout.tsx

interface TransactionFormProps {
  children?: React.ReactNode;
  onSuccess?: () => void;
}

export function TransactionForm({ children, onSuccess }: TransactionFormProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [adminFee, setAdminFee] = useState<string>("");

  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch reference data (fetcher diambil dari SWRProvider — tidak ada request duplikat)
  const { mutate } = useSWRConfig();
  const { data: accountsRes } = useSWR<{ data: AccountData[] }>("/api/accounts");
  const { data: categoriesRes } = useSWR<{ data: CategoryData[] }>(`/api/categories?type=${type}`);

  const accounts = accountsRes?.data || [];
  const categories = categoriesRes?.data || [];

  // Auto-select first active items when data loads
  useEffect(() => {
    if (accounts.length > 0 && !accountId) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId && type !== "TRANSFER") {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId, type]);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 400); // match globals.css animation duration
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = Number(amount.replace(/[^0-9]/g, ""));

    // Validations
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Nominal tidak valid!");
      triggerShake();
      return;
    }
    if (!accountId) {
      toast.error("Pilih akun sumber!");
      triggerShake();
      return;
    }
    if (type === "TRANSFER" && !toAccountId) {
      toast.error("Pilih akun tujuan!");
      triggerShake();
      return;
    }
    if (type === "TRANSFER" && accountId === toAccountId) {
      toast.error("Akun asal & tujuan sama!");
      triggerShake();
      return;
    }

    setIsSubmitting(true);

    // Background POST via API (Offline-first approach dictates quick UI feedback, 
    // but here we await just to ensure local SQLite write succeeds)
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          type,
          accountId,
          categoryId: type !== "TRANSFER" ? categoryId : undefined,
          toAccountId: type === "TRANSFER" ? toAccountId : undefined,
          description,
          adminFee: type === "TRANSFER" && adminFee ? Number(adminFee.replace(/[^0-9]/g, "")) : undefined,
          date: date.toISOString(),
        }),
      });

      const result = await res.json();

      if (result.success) {
        toast.success("Transaksi tersimpan!");
        setOpen(false);
        // Reset form
        setAmount("");
        setDescription("");
        setAdminFee("");
        setDate(new Date());

        // ─── Strategi 3: Optimistic/Smart Cache Update ─────────
        // Gunakan revalidate: false agar UI ter-update tanpa round-trip DB baru.
        // Data akun perlu di-revalidate karena saldo berubah di server.
        mutate("/api/accounts");
        // Untuk transaksi: inject data baru langsung ke cache SWR (zero DB call)
        mutate(
          "/api/transactions?limit=10",
          (current: { data: TransactionData[] } | undefined) => {
            const prev = current?.data ?? [];
            return { data: [result.data, ...prev].slice(0, 10) };
          },
          { revalidate: false } // ← Kunci: tidak trigger re-fetch ke DB
        );
        mutate(
          "/api/transactions?limit=100",
          (current: { data: TransactionData[] } | undefined) => {
            const prev = current?.data ?? [];
            return { data: [result.data, ...prev].slice(0, 100) };
          },
          { revalidate: false }
        );

        if (onSuccess) onSuccess();
      } else {
        toast.error(result.error || "Gagal menyimpan!");
        triggerShake();
      }
    } catch (err) {
      // In a real pure PWA, we'd save to IDB here if fetch completely fails. 
      // For now, we rely on the internal SQLite write being super fast.
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setAmount("");
      return;
    }
    // Format as simple IDR number string while typing
    const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
    setAmount(formatted);
  };

  const handleAdminFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setAdminFee("");
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
    setAdminFee(formatted);
  };

  // Reset semua state ke default — dipanggil saat dialog ditutup
  const resetForm = () => {
    setType("EXPENSE");
    setAmount("");
    setAccountId("");
    setCategoryId("");
    setToAccountId("");
    setDescription("");
    setDate(new Date());
    setAdminFee("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm(); // Bug 5 Fix: reset state saat dialog ditutup
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button size="icon" className="h-14 w-14 rounded-full shadow-lg">
            +
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">Transaksi Baru</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className={cn("flex flex-col gap-5 p-6", isShaking && "animate-shake")}>

          {/* Type & Date Area */}
          <div className="flex flex-col gap-3">
            <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
              {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setCategoryId(""); // Reset category when type changes
                  }}
                  className={cn(
                    "flex-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-wider transition-all",
                    type === t
                      ? t === "EXPENSE"
                        ? "bg-red-500 text-white shadow-sm"
                        : t === "INCOME"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-blue-500 text-white shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                  )}
                >
                  {t === "EXPENSE" ? "Keluar" : t === "INCOME" ? "Masuk" : "Trf"}
                </button>
              ))}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-xl border-zinc-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 focus:ring-0",
                    !date && "text-zinc-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: id }) : <span>Pilih Tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(day) => day && setDate(day)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Amount Input (Giant) */}
          <div className="flex flex-col items-center justify-center py-4 relative">
            <span className="text-zinc-400 absolute left-4 text-2xl font-light">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className={cn(
                "w-full bg-transparent text-center text-5xl font-bold tracking-tight text-zinc-900 placeholder:text-zinc-300 focus:outline-none dark:text-zinc-50 dark:placeholder:text-zinc-700",
                type === "EXPENSE" ? "text-red-500 dark:text-red-400" : type === "INCOME" ? "text-emerald-500 dark:text-emerald-400" : "text-blue-500 dark:text-blue-400"
              )}
              autoFocus
            />
          </div>

          <div className="space-y-4">
            {/* Account Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-500 uppercase">
                {type === "TRANSFER" ? "Dari Akun" : "Menggunakan Akun"}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl border-zinc-200 bg-white p-3 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <option value="" disabled>Pilih Akun...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.icon} {a.name} ({new Intl.NumberFormat("id-ID").format(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            {/* Transfer Destination or Category */}
            {type === "TRANSFER" ? (
              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-blue-500 uppercase">Ke Akun Tujuan</label>
                  <select
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full rounded-xl border-blue-200 bg-blue-50/50 p-3 text-sm shadow-sm focus:ring-2 focus:ring-blue-500 dark:border-blue-900/50 dark:bg-blue-900"
                  >
                    <option value="" disabled>Pilih Akun Tujuan...</option>
                    {accounts.filter(a => a.id !== accountId).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.icon} {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Biaya Admin (Opsional)</label>
                  <div className="relative">
                    <span className="text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 text-sm font-light">Rp</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={adminFee}
                      onChange={handleAdminFeeChange}
                      placeholder="0"
                      className="w-full border-zinc-200 bg-white pl-10 h-12 rounded-xl text-zinc-900 placeholder:text-zinc-300 dark:text-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Kategori</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl border-zinc-200 bg-white p-3 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <option value="" disabled>Pilih Kategori...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Notes */}
            <div className="space-y-1.5 pt-2">
              <Input
                placeholder="Catatan opsional..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "w-full rounded-xl mt-4 py-6 text-base font-semibold transition-all",
              type === "EXPENSE" ? "bg-red-500 hover:bg-red-600" :
                type === "INCOME" ? "bg-emerald-500 hover:bg-emerald-600" :
                  "bg-blue-500 hover:bg-blue-600"
            )}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Simpan Transaksi"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
