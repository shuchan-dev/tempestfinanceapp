"use client";

import { useState, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AccountData, CreateGoalPayload, GoalData } from "@/types";
import { cn } from "@/lib/utils";

interface GoalFormProps {
  children?: React.ReactNode;
  onSuccess?: () => void;
  initialGoal?: GoalData;
}

const GOAL_ICONS = ["🎯", "🏡", "🚗", "✈️", "📚", "💎", "🏖️", "💼", "🎮", "🎸"];
const GOAL_COLORS = [
  "bg-red-100",
  "bg-orange-100",
  "bg-yellow-100",
  "bg-green-100",
  "bg-blue-100",
  "bg-indigo-100",
  "bg-purple-100",
  "bg-pink-100",
];

export function GoalForm({ children, onSuccess, initialGoal }: GoalFormProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(GOAL_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);
  const [accountId, setAccountId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutate } = useSWRConfig();
  const { data: accountsRes } = useSWR<{ data: AccountData[] }>(
    "/api/accounts",
  );
  const accounts = accountsRes?.data || [];

  // Load initial goal data if editing
  useEffect(() => {
    if (initialGoal && open) {
      setName(initialGoal.name);
      setTargetAmount(initialGoal.targetAmount.toString());
      setCurrentAmount(initialGoal.currentAmount.toString());
      setTargetDate(format(new Date(initialGoal.targetDate), "yyyy-MM-dd"));
      setSelectedIcon(initialGoal.icon || GOAL_ICONS[0]);
      setSelectedColor(initialGoal.color || GOAL_COLORS[0]);
      setAccountId(initialGoal.accountId || "");
    }
  }, [initialGoal, open]);

  const handleAmountChange = (value: string, setter: (v: string) => void) => {
    const rawValue = value.replace(/[^0-9]/g, "");
    if (!rawValue) {
      setter("");
      return;
    }
    const formatted = new Intl.NumberFormat("id-ID").format(Number(rawValue));
    setter(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericTargetAmount = Number(targetAmount.replace(/[^0-9]/g, ""));
    const numericCurrentAmount =
      Number(currentAmount.replace(/[^0-9]/g, "")) || 0;

    if (!name.trim()) {
      toast.error("Nama goal harus diisi");
      return;
    }
    if (!numericTargetAmount || numericTargetAmount <= 0) {
      toast.error("Target amount harus lebih dari 0");
      return;
    }
    if (!targetDate) {
      toast.error("Tanggal target harus dipilih");
      return;
    }

    setIsSubmitting(true);

    try {
      const method = initialGoal ? "PATCH" : "POST";
      const url = initialGoal ? `/api/goals/${initialGoal.id}` : "/api/goals";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetAmount: numericTargetAmount,
          currentAmount: numericCurrentAmount,
          targetDate: new Date(targetDate).toISOString(),
          icon: selectedIcon,
          color: selectedColor,
          accountId: accountId || undefined,
        } as CreateGoalPayload),
      });

      const result = await res.json();

      if (result.success) {
        toast.success(initialGoal ? "Goal diupdate" : "Goal dibuat");
        setOpen(false);
        resetForm();
        mutate("/api/goals");
        onSuccess?.();
      } else {
        toast.error(result.error || "Gagal menyimpan goal");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setTargetDate("");
    setSelectedIcon(GOAL_ICONS[0]);
    setSelectedColor(GOAL_COLORS[0]);
    setAccountId("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {children || (
          <Button size="icon-lg" className="h-12 w-12 rounded-full shadow-lg">
            <Plus className="size-9" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-106.25 p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">
            {initialGoal ? "Edit Goal" : "Goal Baru"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          {/* Icon Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Icon
            </label>
            <div className="grid grid-cols-5 gap-2">
              {GOAL_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={cn(
                    "py-2 rounded-lg text-2xl transition-all border-2",
                    selectedIcon === icon
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300",
                  )}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Nama Goal
            </label>
            <Input
              placeholder="e.g., Liburan ke Bali"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              required
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Target Amount (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                Rp
              </span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={targetAmount}
                onChange={(e) =>
                  handleAmountChange(e.target.value, setTargetAmount)
                }
                className="pl-10 rounded-xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                required
              />
            </div>
          </div>

          {/* Current Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Current Amount (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                Rp
              </span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={currentAmount}
                onChange={(e) =>
                  handleAmountChange(e.target.value, setCurrentAmount)
                }
                className="pl-10 rounded-xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              />
            </div>
          </div>

          {/* Target Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Target Date
            </label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-xl border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              required
            />
          </div>

          {/* Account (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Account (Optional)
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border-zinc-200 bg-white p-3 text-sm shadow-sm focus:ring-2 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <option value="">Tidak ada akun spesifik</option>
              {accounts.map((a) => {
                if (a.children && a.children.length > 0) {
                  return (
                    <optgroup key={a.id} label={`${a.icon || "🏦"} ${a.name}`}>
                      <option value={a.id}>{a.name} Utama</option>
                      {a.children.map((child) => (
                        <option key={child.id} value={child.id}>
                          |_ {child.icon ? `${child.icon} ` : ""}
                          {child.name}
                        </option>
                      ))}
                    </optgroup>
                  );
                }
                return (
                  <option key={a.id} value={a.id}>
                    {a.icon || "💳"} {a.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase">
              Warna (Opsional)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {GOAL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "h-8 rounded-lg transition-all border-2",
                    color,
                    selectedColor === color
                      ? "border-zinc-900 dark:border-zinc-50"
                      : "border-transparent opacity-60 hover:opacity-100",
                  )}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl mt-4 py-6 text-base font-semibold bg-indigo-500 hover:bg-indigo-600"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : null}
            {initialGoal ? "Update Goal" : "Buat Goal"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
