"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SeedPage() {
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Database berhasil di-seed!");
      } else {
        toast.error("Gagal seed database");
      }
    } catch (e) {
      toast.error("Error saat memanggil API");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 dark:bg-zinc-950 p-6">
      <h1 className="text-2xl font-bold dark:text-zinc-50">Setup Awal Database</h1>
      <p className="text-center text-sm text-zinc-500 mb-4">
        Klik tombol di bawah untuk mengisi akun awal (BCA, Cash) dan kategori default.
      </p>
      <button 
        onClick={handleSeed}
        disabled={loading}
        className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white transition-all hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
      >
        {loading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Sedang Menyuntik...</span> : "Jalankan Database Seeder"}
      </button>
    </div>
  );
}
