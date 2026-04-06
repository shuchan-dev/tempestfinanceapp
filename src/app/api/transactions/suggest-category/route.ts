/**
 * API Route: /api/transactions/suggest-category
 *
 * GET - Suggest categories based on description and transaction history
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUserId } from "@/lib/api-utils";
import { suggestCategories, detectDuplicates } from "@/lib/suggestion-utils";
import type { ApiResponse } from "@/types";

interface SuggestionResponse {
  suggestions: Array<{
    categoryId: string;
    categoryName: string;
    icon?: string | null;
    score: number;
    reason: string;
  }>;
  duplicates: Array<{
    transactionId: string;
    date: string;
    description?: string | null;
    amount: number;
    categoryName?: string;
    similarity: number;
    reason: string;
  }>;
}

// ─── GET /api/transactions/suggest-category ───────────────
/**
 * Suggest categories for a transaction based on:
 * - Description keyword matching
 * - Transaction history analysis
 * - Recent category usage
 * - Also detect potential duplicates
 */
export async function GET(
  req: NextRequest,
): Promise<NextResponse<ApiResponse<SuggestionResponse>>> {
  try {
    const { userId, error } = await resolveUserId();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const description = searchParams.get("description") || "";
    const amount = parseFloat(searchParams.get("amount") || "0");
    const type = (searchParams.get("type") || "EXPENSE") as
      | "INCOME"
      | "EXPENSE"
      | "TRANSFER";
    const dateStr = searchParams.get("date") || new Date().toISOString();

    // Get user's categories
    const categories = await db.category.findMany({
      where: { userId: userId!, deletedAt: null },
    });

    // Get user's recent transactions (last 3 months for context)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const dbTransactions = await db.transaction.findMany({
      where: {
        userId: userId!,
        type,
        date: { gte: threeMonthsAgo },
        deletedAt: null,
      },
      include: {
        category: { select: { id: true, name: true, icon: true, type: true } },
        account: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { date: "desc" },
      take: 100,
    });

    // Map to TransactionData format (add isSynced and rename date to createdAt for the functions)
    const mappedTransactions = dbTransactions.map((tx) => ({
      ...tx,
      isSynced: false,
      createdAt: tx.date,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: tx.type as any,
    }));

    // Cast categories to proper type
    const categoriesWithTypes = categories.map((cat) => ({
      ...cat,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: cat.type as any,
    }));

    // Get suggestions
    const suggestions = await suggestCategories(
      description,
      mappedTransactions,
      categoriesWithTypes,
      type,
    );

    // Detect duplicates if description is provided
    let duplicatesList: ReturnType<typeof detectDuplicates> = [];
    if (description.trim().length > 3) {
      duplicatesList = detectDuplicates(
        description,
        amount,
        new Date(dateStr),
        mappedTransactions,
        75, // 75% similarity threshold
      ).slice(0, 3); // Top 3 duplicates
    }

    return NextResponse.json({
      success: true,
      data: {
        suggestions: suggestions.map((s) => ({
          categoryId: s.categoryId,
          categoryName: s.categoryName,
          icon: s.icon,
          score: s.score,
          reason: s.reason,
        })),
        duplicates: duplicatesList.map((d) => ({
          transactionId: d.transactionId,
          date: new Date(d.date).toISOString(),
          description: d.description,
          amount: d.amount,
          categoryName: d.categoryName,
          similarity: d.similarity,
          reason: d.reason,
        })),
      },
    });
  } catch (error) {
    console.error("[GET /api/transactions/suggest-category] Error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat saran kategori" },
      { status: 500 },
    );
  }
}
