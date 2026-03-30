"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Settings, Plus, Wallet, Loader2, Tags, Trash2, LogOut } from "lucide-react";

import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { AccountData, CategoryData, TransactionType } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SettingsPage() {
  const router = useRouter();
  const { data: accountsRes, isLoading, mutate } = useSWR<{ data: AccountData[] }>("/api/accounts", fetcher);
  const accounts = accountsRes?.data || [];

  const { data: categoriesRes, isLoading: catLoading, mutate: mutateCat } = useSWR<{ data: CategoryData[] }>("/api/categories", fetcher);
  const categories = categoriesRes?.data || [];

  // State for Accounts
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountBalance, setNewAccountBalance] = useState("");
  
  // State for Categories
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<TransactionType>("EXPENSE");

  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setNewAccountBalance("");
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
    setNewAccountBalance(formatted);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) {
      toast.error("Nama akun harus diisi!");
      triggerShake();
      return;
    }

    setIsSubmittingAccount(true);
    const numericBalance = Number(newAccountBalance.replace(/[^0-9]/g, "")) || 0;

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAccountName,
          balance: numericBalance,
          icon: "💳", // Default
          color: "#3b82f6", // Default blue
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Akun berhasil ditambahkan!");
        setIsAddingAccount(false);
        setNewAccountName("");
        setNewAccountBalance("");
        mutate(); // refresh accounts config
      } else {
        toast.error(data.error || "Gagal menambah akun");
        triggerShake();
      }
    } catch (err) {
      toast.error("Masalah jaringan");
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Akun dihapus");
        mutate();
      } else {
        toast.error(data.error || "Gagal menghapus");
      }
    } catch (e) {
      toast.error("Masalah jaringan");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Nama kategori harus diisi!");
      triggerShake();
      return;
    }

    setIsSubmittingCat(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName,
          type: newCatType,
          icon: newCatType === "EXPENSE" ? "💸" : "💰",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Kategori berhasil ditambahkan!");
        setIsAddingCat(false);
        setNewCatName("");
        mutateCat();
      } else {
        toast.error(data.error || "Gagal menambah kategori");
        triggerShake();
      }
    } catch (err) {
      toast.error("Masalah jaringan");
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Kategori dihapus");
        mutateCat();
      } else {
        toast.error(data.error || "Gagal menghapus");
      }
    } catch (e) {
      toast.error("Masalah jaringan");
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    setIsSubmittingAccount(true); // reuse untuk blok logout
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Berhasil keluar dari aplikasi.");
        // Hard refresh to clear cached frontend states and let middleware redirect
        window.location.href = "/login";
      } else {
        toast.error("Gagal keluar.");
      }
    } catch (e) {
      toast.error("Masalah jaringan");
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 pt-10 pb-32 min-h-screen">
      <header className="space-y-2 sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md pb-4 z-10 -mx-6 px-6 pt-4 border-b border-zinc-100 dark:border-zinc-800">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-500" />
          Pengaturan
        </h1>
        <p className="text-sm font-medium text-zinc-500">
          Kelola akun bank, e-wallet, dan konfigurasi aplikasi.
        </p>
      </header>

      {/* Akun & Saldo Awal */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-500" />
            Daftar Akun Anda
          </h2>
          {!isAddingAccount && (
            <Button size="sm" onClick={() => setIsAddingAccount(true)} className="rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Plus className="w-4 h-4 mr-1" />
              Akun Baru
            </Button>
          )}
        </div>

        {/* Input Akun Baru */}
        {isAddingAccount && (
          <form 
            onSubmit={handleAddAccount} 
            className={cn("bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-sm space-y-4 relative overflow-hidden", shake && "animate-shake")}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Tambah Akun Baru</h3>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Nama Akun</label>
                <Input 
                  autoFocus
                  placeholder="BCA, GoPay, Tunai..." 
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="rounded-xl border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
                  disabled={isSubmittingAccount}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Saldo Awal (Opsional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">Rp</span>
                  <Input 
                    placeholder="0" 
                    value={newAccountBalance}
                    onChange={handleBalanceChange}
                    inputMode="numeric"
                    className="rounded-xl pl-9 border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 font-semibold"
                    disabled={isSubmittingAccount}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 rounded-xl border-zinc-200"
                onClick={() => setIsAddingAccount(false)}
                disabled={isSubmittingAccount}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 text-white"
                disabled={isSubmittingAccount}
              >
                {isSubmittingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </form>
        )}

        {/* List Akun */}
        <div className="flex flex-col gap-3">
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-sm bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
              Belum ada akun, silakan tambahkan.
            </div>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className="flex items-center justify-between p-4 rounded-2xl bg-white shadow-sm border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 min-w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-lg">
                    {acc.icon || "💳"}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{acc.name}</span>
                    <span className="text-xs text-zinc-500">Saldo: {formatCurrency(acc.balance)}</span>
                  </div>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={deletingId === acc.id || acc.balance !== 0}
                      className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title={acc.balance !== 0 ? "Saldo harus 0 untuk menghapus akun" : "Hapus Akun"}
                    >
                      {deletingId === acc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Akun {acc.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Menghapus akun ini juga akan 
                        menghapus catatan transaksi (histori) yang terkait dengannya demi
                        menjaga konsistensi data secara offline.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
                      >
                        Ya, Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Categories Management */}
      <section className="space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Tags className="w-5 h-5 text-emerald-500" />
            Manajemen Kategori
          </h2>
          {!isAddingCat && (
            <Button size="sm" onClick={() => setIsAddingCat(true)} className="rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Plus className="w-4 h-4 mr-1" />
              Kategori Baru
            </Button>
          )}
        </div>

        {/* Input Kategori Baru */}
        {isAddingCat && (
          <form 
            onSubmit={handleAddCategory} 
            className={cn("bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 shadow-sm space-y-4 relative overflow-hidden", shake && "animate-shake")}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Tambah Kategori Baru</h3>
            
            <div className="space-y-3">
              <div className="flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                {(["EXPENSE", "INCOME"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewCatType(t)}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-xs font-semibold uppercase tracking-wider transition-all",
                      newCatType === t
                        ? t === "EXPENSE"
                          ? "bg-red-500 text-white shadow-sm"
                          : "bg-emerald-500 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                    )}
                  >
                    {t === "EXPENSE" ? "Pengembalian Keluar" : "Pemasukan"}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Nama Kategori</label>
                <Input 
                  autoFocus
                  placeholder="Bahan Pokok, Gaji, Hadiah..." 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="rounded-xl border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
                  disabled={isSubmittingCat}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 rounded-xl border-zinc-200"
                onClick={() => setIsAddingCat(false)}
                disabled={isSubmittingCat}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                disabled={isSubmittingCat}
              >
                {isSubmittingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </form>
        )}

        {/* List Kategori */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {catLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
          ) : categories.length === 0 ? (
            <div className="col-span-1 sm:col-span-2 text-center py-8 text-zinc-500 text-sm bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
              Belum ada kategori.
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-white shadow-sm border border-zinc-100 dark:bg-zinc-900 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-sm", cat.type === "EXPENSE" ? "bg-red-50 text-red-500 dark:bg-red-950/30" : "bg-emerald-50 text-emerald-500 dark:bg-emerald-950/30")}>
                    {cat.icon || (cat.type === "EXPENSE" ? "📉" : "📈")}
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">{cat.name}</span>
                </div>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={deletingId === cat.id}
                      className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      {deletingId === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[90vw] max-w-md rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Kategori {cat.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Anda yakin ingin menghapus kategori ini? Data histori transaksi
                        tidak akan terhapus, namun label kategorinya akan berubah menjadi 
                        "Tanpa Kategori".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="rounded-xl bg-red-500 hover:bg-red-600 text-white"
                      >
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </div>
      </section>
      {/* Tambahan pengaturan lain nanti (Google Sheets dll) akan di sini */}

      {/* Akun Pengguna / Logout */}
      <section className="space-y-4 mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col gap-2">
           <h2 className="text-lg font-bold tracking-tight text-red-500 dark:text-red-400 flex items-center gap-2">
            <LogOut className="w-5 h-5" />
            Akses Aplikasi
          </h2>
          <p className="text-sm text-zinc-500 mb-2">Mengeluarkan sesi Anda dari perangkat ini.</p>
          <Button 
            onClick={handleLogout} 
            disabled={isSubmittingAccount}
            variant="destructive" 
            className="w-full sm:w-auto self-start rounded-xl font-semibold shadow-sm"
          >
            {isSubmittingAccount ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
            Keluar (Logout)
          </Button>
        </div>
      </section>
    </div>
  );
}
