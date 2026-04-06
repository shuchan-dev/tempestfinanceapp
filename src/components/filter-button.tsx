/**
 * FilterButton — Filter UI with active filter chips and advanced modal
 */

"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";

export interface FilterState {
  type?: "INCOME" | "EXPENSE" | "TRANSFER";
  categoryId?: string;
  accountId?: string;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
}

interface FilterButtonProps {
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  categories: Array<{ id: string; name: string; icon?: string; type: string }>;
  accounts: Array<{ id: string; name: string; icon?: string }>;
}

export function FilterButton({
  activeFilters,
  onFilterChange,
  categories,
  accounts,
}: FilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterState>(activeFilters);

  const handleApply = () => {
    onFilterChange(tempFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    setTempFilters({});
    onFilterChange({});
    setIsOpen(false);
  };

  const removeFilter = (key: keyof FilterState) => {
    const updated = { ...activeFilters };
    delete updated[key];
    onFilterChange(updated);
  };

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 gap-2",
                hasActiveFilters &&
                  "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400",
              )}
            >
              <Filter className="h-4 w-4" />
              Filter
              {hasActiveFilters && (
                <span className="px-2 py-0.5 text-xs font-bold bg-emerald-200 dark:bg-emerald-900/50 rounded-full">
                  {Object.keys(activeFilters).length}
                </span>
              )}
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Filter Transaksi</DialogTitle>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {/* Type Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Tipe Transaksi
                </label>
                <div className="flex gap-2">
                  {["INCOME", "EXPENSE", "TRANSFER"].map((t) => (
                    <button
                      key={t}
                      onClick={() =>
                        setTempFilters({
                          ...tempFilters,
                          type:
                            tempFilters.type === t
                              ? undefined
                              : (t as "INCOME" | "EXPENSE" | "TRANSFER"),
                        })
                      }
                      className={cn(
                        "flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors",
                        tempFilters.type === t
                          ? "bg-emerald-500 text-white border-emerald-600"
                          : "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
                      )}
                    >
                      {t === "INCOME"
                        ? "Masuk"
                        : t === "EXPENSE"
                          ? "Keluar"
                          : "Transfer"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Kategori
                </label>
                <select
                  value={tempFilters.categoryId || ""}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      categoryId: e.target.value || undefined,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Filter */}
              <div>
                <label className="text-sm font-medium mb-2 block">Akun</label>
                <select
                  value={tempFilters.accountId || ""}
                  onChange={(e) =>
                    setTempFilters({
                      ...tempFilters,
                      accountId: e.target.value || undefined,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="">Semua Akun</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.icon} {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Min Nominal
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={tempFilters.amountMin || ""}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        amountMin: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Max Nominal
                  </label>
                  <Input
                    type="number"
                    placeholder="999999999"
                    value={tempFilters.amountMax || ""}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        amountMax: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Dari Tanggal
                  </label>
                  <Input
                    type="date"
                    value={tempFilters.dateFrom || ""}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        dateFrom: e.target.value || undefined,
                      })
                    }
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Sampai Tanggal
                  </label>
                  <Input
                    type="date"
                    value={tempFilters.dateTo || ""}
                    onChange={(e) =>
                      setTempFilters({
                        ...tempFilters,
                        dateTo: e.target.value || undefined,
                      })
                    }
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="flex-1"
                  >
                    Reset
                  </Button>
                )}
                <Button size="sm" onClick={handleApply} className="flex-1">
                  Terapkan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.type && (
            <FilterChip
              label={`Tipe: ${activeFilters.type === "INCOME" ? "Masuk" : activeFilters.type === "EXPENSE" ? "Keluar" : "Transfer"}`}
              onRemove={() => removeFilter("type")}
            />
          )}
          {activeFilters.categoryId && (
            <FilterChip
              label={`Kategori: ${categories.find((c) => c.id === activeFilters.categoryId)?.name}`}
              onRemove={() => removeFilter("categoryId")}
            />
          )}
          {activeFilters.accountId && (
            <FilterChip
              label={`Akun: ${accounts.find((a) => a.id === activeFilters.accountId)?.name}`}
              onRemove={() => removeFilter("accountId")}
            />
          )}
          {(activeFilters.amountMin || activeFilters.amountMax) && (
            <FilterChip
              label={`Nominal: ${formatCurrency(activeFilters.amountMin || 0)} - ${activeFilters.amountMax ? formatCurrency(activeFilters.amountMax) : "∞"}`}
              onRemove={() => {
                removeFilter("amountMin");
                removeFilter("amountMax");
              }}
            />
          )}
          {(activeFilters.dateFrom || activeFilters.dateTo) && (
            <FilterChip
              label={`Tanggal: ${activeFilters.dateFrom || "?"} → ${activeFilters.dateTo || "?"}`}
              onRemove={() => {
                removeFilter("dateFrom");
                removeFilter("dateTo");
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors ml-1"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
