/**
 * PageContainer — Reusable wrapper for all pages with consistent bottom padding
 * Ensures bottom nav never overlaps content on any device
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 p-6 pt-10",
        "pb-[calc(7rem+env(safe-area-inset-bottom))]", // 7rem (28) + safe area
        className,
      )}
    >
      {children}
    </div>
  );
}
