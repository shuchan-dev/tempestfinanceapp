/**
 * export.ts — Utility untuk export data transaksi ke CSV dan PDF
 *
 * CSV: Pure JS (zero deps)
 * PDF: jsPDF + jspdf-autotable (lazy-loaded agar tidak membloat initial bundle)
 */

import type { TransactionData } from "@/types";

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// ─── CSV Export ───────────────────────────────────────────────
export function exportToCSV(transactions: TransactionData[], filename?: string) {
  const headers = [
    "Tanggal",
    "Tipe",
    "Kategori",
    "Akun Asal",
    "Akun Tujuan",
    "Nominal",
    "Biaya Admin",
    "Catatan",
  ];

  const rows = transactions.map((tx) => [
    DATE_FORMAT.format(new Date(tx.date)),
    tx.type,
    tx.type === "TRANSFER"
      ? "Transfer"
      : tx.category?.name ?? "Tanpa Kategori",
    tx.account?.name ?? "",
    tx.toAccount?.name ?? "",
    tx.amount,
    tx.adminFee ?? 0,
    tx.description ?? "",
  ]);

  const csvLines = [headers, ...rows].map((row) =>
    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
  );

  // BOM untuk Excel agar bisa baca karakter Indonesia
  const blob = new Blob(["\uFEFF" + csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  downloadBlob(blob, filename ?? `tempest-export-${todayString()}.csv`);
}

// ─── PDF Export ───────────────────────────────────────────────
export async function exportToPDF(transactions: TransactionData[], filename?: string) {
  // Lazy load agar tidak masuk initial bundle
  const jsPDFModule = await import("jspdf");
  const autoTableModule = await import("jspdf-autotable");

  const jsPDF = jsPDFModule.jsPDF;
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text("Tempest Finance", 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text(`Laporan Transaksi — ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`, 14, 26);

  const tableData = transactions.map((tx) => [
    DATE_FORMAT.format(new Date(tx.date)),
    tx.type,
    tx.type === "TRANSFER" ? "Transfer" : (tx.category?.name ?? "Tanpa Kategori"),
    (tx.account?.name ?? "") + (tx.toAccount ? ` -> ${tx.toAccount.name}` : ""),
    IDR.format(tx.amount),
    tx.adminFee && tx.adminFee > 0 ? IDR.format(tx.adminFee) : "-",
    tx.description ?? "-",
  ]);

  autoTable(doc, {
    startY: 32,
    head: [["Tanggal", "Tipe", "Kategori", "Akun", "Nominal", "Admin", "Catatan"]],
    body: tableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 18 },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  doc.save(filename ?? `tempest-export-${todayString()}.pdf`);
}

// ─── Helpers ─────────────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}
