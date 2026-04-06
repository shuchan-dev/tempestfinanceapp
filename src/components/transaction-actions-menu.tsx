/**
 * TransactionActionsMenu — Edit/Delete actions for transaction items
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

interface TransactionActionsMenuProps {
  transactionId: string;
  onEdit: () => void;
}

export function TransactionActionsMenu({
  transactionId,
  onEdit,
}: TransactionActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { mutate } = useSWRConfig();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transactionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Gagal menghapus transaksi");
        return;
      }

      toast.success("Transaksi berhasil dihapus");
      setShowDeleteConfirm(false);
      setIsOpen(false);

      // Revalidate transaction list and accounts
      mutate(
        (key) => typeof key === "string" && key.includes("/api/transactions"),
        undefined,
        {
          revalidate: true,
        },
      );
      mutate("/api/accounts");
    } catch (err) {
      toast.error("Error menghapus transaksi");
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="Aksi"
        >
          <MoreVertical className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50">
            <button
              onClick={() => {
                onEdit();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors first:rounded-t-lg"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors last:rounded-b-lg"
            >
              <Trash2 className="h-4 w-4" />
              Hapus
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Transaksi ini akan dihapus secara permanen. Tindakan ini tidak
              dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
