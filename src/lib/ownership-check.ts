import { db } from "@/lib/db";
import { errorResponse } from "./api-response";

/**
 * Validates ownership and provides a generic "Not Found" error to prevent IDOR mapping
 */
export async function checkOwnership(
  model: 'account' | 'category' | 'budget' | 'debt' | 'debtPayment' | 'transaction' | 'goal',
  id: string,
  userId: string,
  includeDeleted = false
) {
  let exists = null;
  const where: any = { id, userId };
  if (!includeDeleted && ['account', 'category', 'budget', 'debt', 'debtPayment', 'transaction', 'goal'].includes(model)) {
    where.deletedAt = null;
  }

  switch (model) {
    case 'account':
      exists = await db.account.findFirst({ where });
      break;
    case 'category':
      exists = await db.category.findFirst({ where });
      break;
    case 'budget':
      exists = await db.budget.findFirst({ where });
      break;
    case 'debt':
      exists = await db.debt.findFirst({ where });
      break;
    case 'debtPayment':
      exists = await db.debtPayment.findFirst({ where });
      break;
    case 'transaction':
      exists = await db.transaction.findFirst({ where });
      break;
    case 'goal':
      exists = await db.goal.findFirst({ where });
      break;
  }

  if (!exists) {
    return { error: errorResponse(`Data tidak ditemukan`, 404), item: null };
  }

  return { error: null, item: exists };
}
