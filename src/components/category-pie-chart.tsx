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
              backgroundColor: "rgb(24, 24, 27)",
              border: "1px solid rgb(39, 39, 42)",
              borderRadius: "8px",
              color: "white",
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {/* Category breakdown table */}
      <div className="mt-6 space-y-2">
        {data.map((item, index) => (
          <div
            key={item.categoryId}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-zinc-700 dark:text-zinc-300">
                {item.categoryIcon} {item.categoryName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {formatCurrency(item.spent)}
              </span>
              {item.budget && (
                <span className="text-zinc-500 text-xs">
                  {Math.round(item.percentage)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
