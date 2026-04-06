import { db } from "@/lib/db";
import { errorResponse } from "./api-response";

/**
 * Validates ownership and provides a generic "Not Found" error to prevent IDOR mapping
 */
export async function checkOwnership(model: 'account' | 'category' | 'budget' | 'debt' | 'debtPayment' | 'transaction', id: string, userId: string) {
  let exists = null;
  switch (model) {
    case 'account':
      exists = await db.account.findFirst({ where: { id, userId } });
      break;
    case 'category':
      exists = await db.category.findFirst({ where: { id, userId } });
      break;
    case 'budget':
      exists = await db.budget.findFirst({ where: { id, userId } });
      break;
    case 'debt':
      exists = await db.debt.findFirst({ where: { id, userId } });
      break;
    case 'debtPayment':
      exists = await db.debtPayment.findFirst({ where: { id, userId } });
      break;
    case 'transaction':
      exists = await db.transaction.findFirst({ where: { id, userId } });
      break;
  }

  if (!exists) {
    return { error: errorResponse(`Data tidak ditemukan`, 404), item: null };
  }

  return { error: null, item: exists };
}
