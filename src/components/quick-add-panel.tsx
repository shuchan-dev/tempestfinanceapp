"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuickAddPanel() {
  const { data: qRes, mutate: mutateQuickAdds } = useSWR("/api/quick-adds");
  const quickAdds = qRes?.data || [];

  const { data: aRes } = useSWR("/api/accounts");
  const accounts = aRes?.data || [];
  
  const { data: cRes } = useSWR("/api/categories?type=EXPENSE");
  const categories = cRes?.data || [];

  const { mutate } = useSWRConfig();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [icon, setIcon] = useState("☕");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!name || !amount || !categoryId || !accountId) {
      toast.error("Semua field wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/quick-adds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount: Number(amount),
          icon,
          categoryId,
          accountId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Preset berhasil dibuat");
      mutateQuickAdds();
      setOpen(false);
      setName("");
      setAmount("");
      setIcon("☕");
      setCategoryId("");
      setAccountId("");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat preset");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = async (preset: any) => {
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: preset.amount,
          type: "EXPENSE",
          accountId: preset.accountId,
          categoryId: preset.categoryId,
          date: new Date().toISOString(),
          description: preset.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`✅ ${preset.name} -${formatCurrency(preset.amount)} tersimpan`);
      
      mutate("/api/transactions?limit=10");
      mutate("/api/accounts");
    } catch (err: any) {
      toast.error(err.message || "Gagal membuat transaksi");
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
      {quickAdds.map((preset: any) => (
        <button
          key={preset.id}
          onClick={() => handleApply(preset)}
          className="flex min-w-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-4 shadow-sm snap-center border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 transition-colors"
        >
          <span className="text-3xl">{preset.icon}</span>
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate w-[100px]">{preset.name}</p>
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">{formatCurrency(preset.amount)}</p>
          </div>
        </button>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="flex min-w-[120px] flex-col items-center justify-center gap-2 rounded-2xl bg-zinc-50 p-4 shadow-sm snap-center border border-dashed border-zinc-300 dark:bg-zinc-900/50 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <span className="text-3xl text-zinc-400">➕</span>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-500">Tambah</p>
              <p className="text-xs font-medium text-zinc-400">Preset</p>
            </div>
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Buat Preset Transaksi Cepat</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nama Preset</label>
              <Input
                placeholder="Ex. Kopi Pagi"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nominal</label>
              <Input
                type="number"
                placeholder="20000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Icon / Emoji</label>
              <Input
                placeholder="☕"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Akun (Sumber Dana)</label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="" disabled>Pilih Akun</option>
                {accounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>{acc.icon} {acc.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Kategori</label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="" disabled>Pilih Kategori</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan Preset"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
