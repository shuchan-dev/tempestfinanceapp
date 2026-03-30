"use client";

/**
 * CashflowChart — Visualisasi Income vs Expense 6 bulan terakhir
 * Menggunakan recharts BarChart — ringan dan responsive
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { MonthlyData } from "@/types";

interface CashflowChartProps {
  data: MonthlyData[];
}

const MONTH_NAMES: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mei", "06": "Jun", "07": "Jul", "08": "Agu",
  "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des",
};

function formatShortCurrency(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return `${value}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const [year, month] = (label as string).split("-");
  const monthName = MONTH_NAMES[month] ?? month;
  return (
    <div className="rounded-xl bg-zinc-900 p-3 shadow-xl border border-zinc-700 text-xs min-w-[140px]">
      <p className="font-semibold text-zinc-300 mb-2">{monthName} {year}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.fill }}>
            {entry.name === "income" ? "Pemasukan" : "Pengeluaran"}
          </span>
          <span className="font-bold text-white">
            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CashflowChart({ data }: CashflowChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    label: `${d.month.split("-")[0]}-${d.month.split("-")[1]}`,
  }));

  return (
    <div className="w-full h-52">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} barGap={4} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={(val) => MONTH_NAMES[val.split("-")[1]] ?? val}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatShortCurrency}
            tick={{ fill: "#71717a", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#27272a80" }} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-zinc-400">
                {value === "income" ? "Pemasukan" : "Pengeluaran"}
              </span>
            )}
          />
          <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="income" />
          <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} name="expense" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
