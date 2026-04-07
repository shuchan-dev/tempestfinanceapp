"use client";

import { AlertCircle, Sparkles } from "lucide-react";

interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  icon?: string | null;
  score: number;
  reason: string;
}

interface DuplicateWarning {
  transactionId: string;
  date: string;
  description?: string | null;
  amount: number;
  categoryName?: string;
  similarity: number;
  reason: string;
}

interface SuggestionBoxProps {
  suggestions: CategorySuggestion[];
  duplicates: DuplicateWarning[];
  onSelectSuggestion?: (categoryId: string) => void;
}

export function SuggestionBox({
  suggestions,
  duplicates,
  onSelectSuggestion,
}: SuggestionBoxProps) {
  if (suggestions.length === 0 && duplicates.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Category Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
              Saran Kategori
            </label>
          </div>
          <div className="space-y-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.categoryId}
                type="button"
                onClick={() => onSelectSuggestion?.(suggestion.categoryId)}
                className="w-full text-left p-2.5 rounded-lg border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{suggestion.icon || "📂"}</span>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
                        {suggestion.categoryName}
                      </span>
                      <span className="text-xs text-indigo-700 dark:text-indigo-300">
                        {suggestion.reason}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {suggestion.score}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Warnings */}
      {duplicates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">
              Kemungkinan Duplikat
            </label>
          </div>
          <div className="space-y-1.5">
            {duplicates.map((duplicate) => (
              <div
                key={duplicate.transactionId}
                className="p-2.5 rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      {duplicate.description || "Transaksi tanpa deskripsi"}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                      {duplicate.reason} ({duplicate.similarity}% match pada{" "}
                      {new Date(duplicate.date).toLocaleDateString("id-ID")})
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
