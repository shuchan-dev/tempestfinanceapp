/**
 * Smart Category Suggestion Utility
 * Analyzes transaction history to suggest the best matching category
 */

import type { TransactionData, CategoryData } from "@/types";

interface CategoryScore {
  categoryId: string;
  categoryName: string;
  icon?: string | null;
  score: number; // 0-100
  reason: string; // Why it was suggested
}

/**
 * Suggest categories based on transaction description and history
 */
export async function suggestCategories(
  description: string,
  transactions: TransactionData[],
  categories: CategoryData[],
  transactionType: "INCOME" | "EXPENSE" | "TRANSFER",
): Promise<CategoryScore[]> {
  if (transactionType === "TRANSFER" || !description.trim()) {
    return [];
  }

  // Filter categories by type
  const validCategories = categories.filter((c) => c.type === transactionType);
  if (validCategories.length === 0) return [];

  const descLower = description.toLowerCase();
  const scores: CategoryScore[] = [];

  // Analyze each category
  for (const category of validCategories) {
    let score = 0;
    let reason = "";

    // Get all transactions for this category
    const categoryTransactions = transactions.filter(
      (tx) => tx.categoryId === category.id,
    );

    if (categoryTransactions.length === 0) {
      continue; // Skip categories with no history
    }

    // 1. Keyword matching (40 points max)
    const categoryName = category.name.toLowerCase();
    if (description.includes(categoryName)) {
      score += 40;
      reason = `Matched category name "${category.name}"`;
    } else {
      // Check for common keywords in descriptions
      const keywords = extractKeywords(categoryName);
      const matchedKeywords = keywords.filter((kw) => description.includes(kw));
      if (matchedKeywords.length > 0) {
        score += 20 + matchedKeywords.length * 5;
        reason = `Matched keywords: ${matchedKeywords.join(", ")}`;
      }
    }

    // 2. Description frequency (30 points max)
    // If this exact description appears in this category's history, boost score
    const sameDescription = categoryTransactions.find(
      (tx) => tx.description?.toLowerCase() === descLower,
    );
    if (sameDescription) {
      score += 30;
      reason = reason
        ? `${reason}. Exact match in history.`
        : "Exact match in transaction history";
    }

    // 3. Frequency (20 points max) - if category has many transactions, slightly boost
    const frequencyBoost = Math.min(categoryTransactions.length / 20, 20);
    score += frequencyBoost;

    // 4. Recent usage (10 points max)
    const recentTx = categoryTransactions[categoryTransactions.length - 1];
    if (recentTx) {
      const daysSinceLastUse = Math.floor(
        (Date.now() - new Date(recentTx.date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysSinceLastUse < 30) {
        score += 10;
        reason = reason
          ? `${reason}. Recently used.`
          : "Recently used category";
      }
    }

    if (score > 0) {
      scores.push({
        categoryId: category.id,
        categoryName: category.name,
        icon: category.icon,
        score: Math.min(score, 100),
        reason,
      });
    }
  }

  // Sort by score descending and return top 3
  return scores.sort((a, b) => b.score - a.score).slice(0, 3);
}

/**
 * Extract keywords from category name for matching
 */
function extractKeywords(text: string): string[] {
  const words = text.split(/[\s-_]+/);
  const keywords: string[] = [];

  for (const word of words) {
    if (word.length > 2) {
      keywords.push(word);
    }
  }

  return keywords;
}

/**
 * Detect duplicate transactions
 * Returns list of similar transactions that might be duplicates
 */
export interface DuplicateWarning {
  transactionId: string;
  date: Date;
  description?: string | null;
  amount: number;
  categoryName?: string;
  similarity: number; // 0-100
  reason: string;
}

export function detectDuplicates(
  newDescription: string,
  newAmount: number,
  newDate: Date,
  transactions: TransactionData[],
  threshold: number = 70,
): DuplicateWarning[] {
  const duplicates: DuplicateWarning[] = [];
  const newDescLower = newDescription.toLowerCase();
  const newDateStart = new Date(newDate);
  newDateStart.setHours(0, 0, 0, 0);

  // Look for transactions in the last 7 days
  const sevenDaysAgo = new Date(newDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const tx of transactions) {
    if (new Date(tx.date) < sevenDaysAgo) continue; // Skip old transactions

    let similarity = 0;
    let reason = "";

    // 1. Amount match (50 points) - exact or very close
    const amountDiff = Math.abs(tx.amount - newAmount);
    const amountDiffPercent = (amountDiff / newAmount) * 100;

    if (amountDiff === 0) {
      similarity += 50;
      reason += "Exact amount match. ";
    } else if (amountDiffPercent < 5) {
      similarity += 40;
      reason += "Similar amount (±5%). ";
    } else if (amountDiffPercent < 10) {
      similarity += 20;
      reason += "Similar amount (±10%). ";
    }

    // 2. Description match (30 points)
    const descSimilarity = calculateStringSimilarity(
      newDescLower,
      tx.description?.toLowerCase() || "",
    );
    similarity += descSimilarity * 30;

    if (descSimilarity > 0.8) {
      reason += "Very similar description. ";
    } else if (descSimilarity > 0.6) {
      reason += "Similar description. ";
    }

    // 3. Date proximity (20 points)
    const txDate = new Date(tx.date);
    txDate.setHours(0, 0, 0, 0);

    if (txDate.getTime() === newDateStart.getTime()) {
      similarity += 20;
      reason += "Same day. ";
    } else {
      const dayDiff = Math.abs(
        (txDate.getTime() - newDateStart.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (dayDiff <= 1) {
        similarity += 10;
        reason += "Adjacent days. ";
      }
    }

    if (similarity >= threshold) {
      duplicates.push({
        transactionId: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        categoryName: tx.category?.name,
        similarity: Math.min(similarity, 100),
        reason: reason.trim(),
      });
    }
  }

  return duplicates.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Calculate string similarity using Levenshtein-like approach
 * Returns value between 0 and 1
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  // Simple word-based similarity
  const words1 = str1.split(/\s+/).filter((w) => w.length > 2);
  const words2 = str2.split(/\s+/).filter((w) => w.length > 2);

  if (words1.length === 0 && words2.length === 0) return 1;
  if (words1.length === 0 || words2.length === 0) return 0;

  const matches = words1.filter((w) => words2.includes(w)).length;
  const totalWords = Math.max(words1.length, words2.length);

  return matches / totalWords;
}
