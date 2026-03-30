"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListOrdered, BarChart3, HandCoins, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/history", label: "Riwayat", icon: ListOrdered },
  { href: "/analytics", label: "Analitik", icon: BarChart3 },
  { href: "/debts", label: "Hutang", icon: HandCoins },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/80 pb-safe pt-2 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80 md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-6 pb-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center space-y-1 rounded-xl p-2 transition-all duration-200",
                isActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-16 items-center justify-center rounded-full transition-all duration-300",
                  isActive
                    ? "bg-emerald-100 dark:bg-emerald-500/20"
                    : "bg-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className="text-[10px] font-medium tracking-wide">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
