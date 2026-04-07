"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { CategorySpending } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface CategoryPieChartProps {
  data: CategorySpending[];
}

// Color palette for pie chart
const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f59e0b", // amber
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-zinc-500">
        Belum ada data pengeluaran
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.categoryName,
    value: item.spent,
    icon: item.categoryIcon,
  }));

  const renderCustomLabel = ({ percent }: { percent?: number }) => {
    if (!percent) return "";
    return `${(percent * 100).toFixed(0)}%`;
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--tooltip-bg, white)",
              border: "1px solid var(--tooltip-border, #e4e4e7)",
              borderRadius: "8px",
              color: "var(--tooltip-text, #18181b)",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
