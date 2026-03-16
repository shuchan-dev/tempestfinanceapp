"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return toast.error("Nama wajib diisi!");
    }
    if (pin.length !== 6) {
      return toast.error("PIN harus tepat 6 digit angka!");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(data.message);
        router.push("/login");
      } else {
        toast.error(data.error || "Gagal mendaftar");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan jaringan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (val.length <= 6) setPin(val);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Daftar Akun
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Buat akun baru untuk mulai mengelola keuangan Anda dengan Tempest.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                User Name
              </label>
              <Input
                id="name"
                placeholder="Misal: Jhon Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl border-zinc-200 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="pin"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Buat Kode Akses
              </label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••••"
                value={pin}
                onChange={handlePinChange}
                className="h-12 rounded-xl text-center text-xl tracking-widest border-zinc-200 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || pin.length !== 6 || !name.trim()}
            className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Daftar Sekarang"
            )}
          </Button>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-500 hover:underline"
            >
              Masuk
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
