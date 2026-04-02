import useSWR from "swr";
import type { AccountData, TransactionData } from "@/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDashboardData() {
  const { data: accountsRes, isLoading: accountsLoading } = useSWR<{
    data: AccountData[];
  }>("/api/accounts", fetcher);

  const { data: txRes, isLoading: txLoading } = useSWR<{ data: TransactionData[] }>(
    "/api/transactions?limit=10",
    fetcher,
  );

  const accounts = accountsRes?.data || [];
  const transactions = txRes?.data || [];

  const totalBalance = accounts.reduce((sum, acc) => {
    const parentBalance = acc.balance;
    const childrenBalance = acc.children?.reduce((cSum, c) => cSum + c.balance, 0) || 0;
    return sum + parentBalance + childrenBalance;
  }, 0);

  return {
    accounts,
    transactions,
    totalBalance,
    accountsLoading,
    txLoading,
    isLoading: accountsLoading || txLoading,
  };
}
