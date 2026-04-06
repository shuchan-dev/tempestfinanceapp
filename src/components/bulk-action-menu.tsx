"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FolderSymlink, Trash2, X, CheckSquare, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface BulkActionMenuProps {
  selectedIds: string[];
  categories: any[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export function BulkActionMenu({
  selectedIds,
  categories,
  onClearSelection,
  onSuccess,
}: BulkActionMenuProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const handleBulkDelete = async () => {
    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} transaksi?`)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", transactionIds: selectedIds }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        onClearSelection();
        onSuccess();
      } else {
        toast.error(data.error || "Gagal menghapus");
      }
    } catch {
      toast.error("Masalah jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecategorize = async (categoryId: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recategorize", transactionIds: selectedIds, targetCategoryId: categoryId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setIsCategoryOpen(false);
        onClearSelection();
        onSuccess();
      } else {
        toast.error(data.error || "Gagal mengubah kategori");
      }
    } catch {
      toast.error("Masalah jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-zinc-800 text-white animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2 pr-4 border-r border-zinc-700">
        <CheckSquare className="h-5 w-5 text-emerald-400" />
        <span className="font-semibold">{selectedIds.length}</span>
      </div>

      <Popover open={isCategoryOpen} onOpenChange={setIsCategoryOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-2 text-zinc-300 hover:text-white hover:bg-zinc-800" disabled={isSubmitting}>
            <FolderSymlink className="h-4 w-4" />
            <span className="hidden sm:inline">Pindah Kategori</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-64 p-2 rounded-xl border-zinc-800 bg-zinc-900 shadow-xl" align="center">
          <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400 mb-1">
            Pilih Kategori Baru
          </div>
          <div className="max-h-60 overflow-y-auto w-full flex flex-col gap-1">
            {categories.map((c) => (
              c.children && c.children.length > 0 ? (
                <div key={c.id} className="flex flex-col mb-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 bg-zinc-800/50 rounded-md">
                    {c.icon} {c.name}
                  </div>
                  {c.children.map((child: any) => (
                    <button
                      key={child.id}
                      onClick={() => handleRecategorize(child.id)}
                      className="text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors pl-6"
                    >
                      {child.icon ? `${child.icon} ` : ""}{child.name}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  key={c.id}
                  onClick={() => handleRecategorize(c.id)}
                  className="text-left px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                >
                  {c.icon ? `${c.icon} ` : ""}{c.name}
                </button>
              )
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="h-8 gap-2 text-red-400 hover:text-red-300 hover:bg-red-950/30" disabled={isSubmitting}>
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Hapus</span>
      </Button>

      <div className="pl-2 ml-2 border-l border-zinc-700">
        <Button variant="ghost" size="icon" onClick={onClearSelection} className="h-8 w-8 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isSubmitting && (
        <div className="absolute inset-0 bg-zinc-900/80 rounded-2xl flex items-center justify-center backdrop-blur-sm z-10">
          <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
        </div>
      )}
    </div>
  );
}
