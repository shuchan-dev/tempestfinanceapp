"use client";

import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { GoalData } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GoalCardProps {
  goal: GoalData;
  onUpdate?: () => void;
}

export function GoalCard({ goal, onUpdate }: GoalCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { mutate } = useSWRConfig();

  const percentage = Math.min(
    (goal.currentAmount / goal.targetAmount) * 100,
    100,
  );
  const remaining = goal.targetAmount - goal.currentAmount;
  const daysLeft = Math.ceil(
    (new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const monthlyNeeded = daysLeft > 0 ? remaining / (daysLeft / 30) : 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      const result = await res.json();

      if (result.success) {
        toast.success("Goal dihapus");
        mutate("/api/goals");
        onUpdate?.();
      } else {
        toast.error(result.error || "Gagal menghapus goal");
      }
    } catch (_err) {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "rounded-2xl p-5 flex items-center gap-4 border-2 transition-all",
          percentage >= 100
            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800"
            : percentage >= 75
              ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
              : "bg-zinc-50 border-zinc-200 dark:bg-zinc-900/50 dark:border-zinc-800",
        )}
      >
        {/* Circular Progress */}
        <div className="relative h-20 w-20 shrink-0">
          <svg className="h-20 w-20 -rotate-90 transform" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke={
                percentage >= 100
                  ? "#10b981"
                  : percentage >= 75
                    ? "#eab308"
                    : "#d1d5db"
              }
              strokeWidth="2"
              opacity="0.2"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke={
                percentage >= 100
                  ? "#10b981"
                  : percentage >= 75
                    ? "#eab308"
                    : "#6366f1"
              }
              strokeWidth="2"
              strokeDasharray={`${(percentage / 100) * 100.53} 100.53`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold">{Math.round(percentage)}%</span>
          </div>
        </div>

        {/* Goal Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {goal.icon} {goal.name}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {formatDistanceToNow(new Date(goal.targetDate), {
                  locale: id,
                  addSuffix: true,
                })}
              </p>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">
                Rp{" "}
                {new Intl.NumberFormat("id-ID").format(
                  Math.round(goal.currentAmount),
                )}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                Rp{" "}
                {new Intl.NumberFormat("id-ID").format(
                  Math.round(goal.targetAmount),
                )}
              </span>
            </div>
            <div className="h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-500",
                  percentage >= 100
                    ? "bg-emerald-500"
                    : percentage >= 75
                      ? "bg-yellow-500"
                      : "bg-indigo-500",
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Monthly Needed */}
          {daysLeft > 0 && (
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
              Perlu Rp{" "}
              {new Intl.NumberFormat("id-ID").format(Math.round(monthlyNeeded))}
              /bulan
            </p>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Hapus Goal?</AlertDialogTitle>
          <AlertDialogDescription>
            Goal &quot;{goal.name}&quot; akan dihapus permanen. Tindakan ini
            tidak dapat dibatalkan.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
