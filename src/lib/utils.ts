/**
 * utils.ts — Utility / Helper Functions
 *
 * Tujuan: Fungsi-fungsi reusable yang digunakan secara global.
 * Prinsip: DRY — jangan tulis logika ini dua kali di tempat berbeda.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// ============================================================
// UI UTILITIES
// ============================================================

/**
 * cn — Menggabungkan Tailwind CSS class names dengan aman.
 * Menangani konflik class (e.g. p-4 dan p-2) secara otomatis.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ============================================================
// FORMAT UTILITIES
// ============================================================

/**
 * formatCurrency — Memformat angka ke format Rupiah Indonesia.
 * Contoh output: "Rp 1.500.000"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * formatDate — Memformat tanggal ke format ringkas bahasa Indonesia.
 * Contoh output: "14 Mar 2026"
 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * formatTime — Memformat waktu dari objek Date.
 * Contoh output: "14:30"
 */
export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
}

/**
 * formatRelativeDate — Tampilkan tanggal relatif (hari ini / kemarin / tanggal).
 */
export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (isSameDay(d, now)) return "Hari ini";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(d, yesterday)) return "Kemarin";

  return formatDate(date);
}

// ============================================================
// TRANSACTION UTILITIES
// ============================================================

/**
 * getTransactionSign — Tanda (+/-) berdasarkan tipe transaksi.
 */
export function getTransactionSign(type: string): "+" | "-" {
  return type === "INCOME" ? "+" : "-";
}

/**
 * getTransactionColor — Class warna Tailwind berdasarkan tipe transaksi.
 */
export function getTransactionColor(type: string): string {
  const colorMap: Record<string, string> = {
    INCOME: "text-emerald-400",
    EXPENSE: "text-red-400",
    TRANSFER: "text-blue-400",
  };
  return colorMap[type] ?? "text-zinc-400";
}

/**
 * truncateText — Potong teks panjang dengan ellipsis.
 */
export function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}
