"use client";

import useSWR from "swr";
import { formatCurrency } from "@/lib/utils";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface BalanceHistoryChartProps {
  accountId: string;
  days?: number;
}

export function BalanceHistoryChart({ accountId, days = 30 }: BalanceHistoryChartProps) {
  const { data: res, isLoading } = useSWR(
    accountId ? `/api/accounts/${accountId}/history?days=${days}` : null
  );

  if (!accountId) return null;

  if (isLoading) {
    return <Skeleton className="w-full h-48 rounded-2xl" />;
  }

  const history = res?.data?.history || [];

  if (history.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-sm font-medium text-zinc-500">Belum ada riwayat saldo</p>
      </div>
    );
  }

  return (
    <div className="w-full h-48 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={history} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`colorBalance-${accountId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
              const d = new Date(tick);
              return `${d.getDate()}/${d.getMonth() + 1}`;
            }}
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: '#71717a' }} 
            minTickGap={20}
          />
          <YAxis 
            hide 
            domain={['dataMin - 1000', 'dataMax + 1000']} 
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-xs font-semibold text-zinc-500 mb-1">
                      {label ? new Date(label as string | number).toLocaleDateString("id-ID", { day: "numeric", month: "long" }) : ""}
                    </p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(payload[0].value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }} 
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke="#10b981" 
            strokeWidth={2}
            fillOpacity={1} 
            fill={`url(#colorBalance-${accountId})`} 
            animationDuration={800}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
