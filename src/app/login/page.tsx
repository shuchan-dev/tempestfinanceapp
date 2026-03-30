"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validasi input sebelum dikirim ke API
    if (!name.trim()) {
      return toast.error("Nama wajib diisi!");
    }
    if (pin.length !== 6) {
      return toast.error("PIN harus tepat 6 digit angka!");
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(`Selamat datang, ${data.name}!`);
        window.location.href = "/";
        // router.push("/");
      } else {
        toast.error(data.error || "Gagal masuk");
        setPin(""); // Clear pin on failure
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
            Masuk Akses
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Masukkan nama dan PIN Anda untuk membuka brankas keuangan Anda.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-5">
            {/* Input Nama */}
            <div className="space-y-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                User Name
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Contoh: Jhon Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus // Pindahkan autoFocus ke input pertama
                className="h-12 rounded-xl border-zinc-200 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>

            {/* Input PIN */}
            <div className="space-y-2">
              <label
                htmlFor="pin"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Kode Akses
              </label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="••••••"
                value={pin}
                onChange={handlePinChange}
                className="h-12 rounded-xl text-center text-3xl tracking-[0.5em] font-mono border-zinc-200 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || pin.length !== 6 || !name.trim()}
            className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 font-semibold transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Buka Brankas"
            )}
          </Button>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Belum punya PIN?{" "}
            <Link
              href="/register"
              className="font-semibold text-emerald-500 hover:underline"
            >
              Daftar Sekarang
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
