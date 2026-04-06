"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  exportToCSV,
  exportToJSON,
  exportToQIF,
  exportToOFX,
  exportToExcel,
  getExportFileName,
} from "@/lib/export-utils";
import type { TransactionData } from "@/types";

interface ExportButtonProps {
  transactions: TransactionData[];
}

export function ExportButton({ transactions }: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  const handleExport = (format: "csv" | "json" | "qif" | "ofx" | "xlsx") => {
    try {
      const fileName = getExportFileName(format);

      if (format === "csv") {
        exportToCSV(transactions, fileName);
      } else if (format === "json") {
        exportToJSON(transactions, fileName);
      } else if (format === "qif") {
        exportToQIF(transactions, fileName);
      } else if (format === "ofx") {
        exportToOFX(transactions, fileName);
      } else if (format === "xlsx") {
        exportToExcel(transactions, fileName);
      }

      toast.success(
        `${transactions.length} transaksi berhasil diexport sebagai ${format.toUpperCase()}`,
      );
      setOpen(false);
    } catch (err) {
      toast.error("Gagal mengexport transaksi");
      console.error(err);
    }
  };

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-lg">
          <Download className="w-4 h-4 mr-1" />
          Export
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Transaksi</DialogTitle>
          <DialogDescription>
            Pilih format export untuk {transactions.length} transaksi
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* CSV Export */}
          <button
            onClick={() => handleExport("csv")}
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
          >
            <span className="text-3xl mb-2">📊</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              CSV
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Excel, Sheets</p>
          </button>

          {/* JSON Export */}
          <button
            onClick={() => handleExport("json")}
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
          >
            <span className="text-3xl mb-2">⚙️</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              JSON
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Backup, API</p>
          </button>

          {/* QIF Export */}
          <button
            onClick={() => handleExport("qif")}
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          >
            <span className="text-3xl mb-2">🏦</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              QIF
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Quicken</p>
          </button>

          {/* OFX Export */}
          <button
            onClick={() => handleExport("ofx")}
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
          >
            <span className="text-3xl mb-2">🏛️</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              OFX
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Banking Software</p>
          </button>

          {/* Excel Export */}
          <button
            onClick={() => handleExport("xlsx")}
            className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-zinc-200 dark:border-zinc-800 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all"
          >
            <span className="text-3xl mb-2">📈</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Excel
            </h3>
            <p className="text-xs text-zinc-500 mt-1">Formatted Report</p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
