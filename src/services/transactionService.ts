import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { CreateTransactionPayload } from "@/types";

// ─── Typed Interfaces ─────────────────────────────────────────

export interface ExistingTransaction {
  id: string;
  amount: number;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  accountId: string;
  toAccountId?: string | null;
  adminFee?: number | null;
}

export interface UpdateTransactionPayload {
  amount?: number;
  description?: string;
  categoryId?: string;
  date?: string;
  tags?: string;
}

// ─── Create Transaction ───────────────────────────────────────

export async function createTransaction(
  userId: string,
  body: CreateTransactionPayload,
) {
  return await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // 1. Simpan data transaksi utama
      const transaction = await tx.transaction.create({
        data: {
          amount: body.amount,
          type: body.type,
          description: body.description,
          date: body.date ? new Date(body.date) : new Date(),
          isSynced: false,
          userId: userId,
          accountId: body.accountId,
          categoryId: body.categoryId?.trim() ? body.categoryId : undefined,
          toAccountId: body.toAccountId?.trim() ? body.toAccountId : undefined,
          adminFee: body.adminFee ?? 0,
          isRecurring: body.isRecurring ?? false,
          recurrenceRule: body.recurrenceRule ?? null,
          recurrenceEndDate: body.recurrenceEndDate
            ? new Date(body.recurrenceEndDate)
            : null,
          isRecurringInstance: body.isRecurringInstance ?? false,
          recurrenceParentId: body.recurrenceParentId ?? null,
          tags: body.tags || null,
        },
        include: {
          account: {
            select: { id: true, name: true, icon: true, color: true },
          },
          category: { select: { id: true, name: true, icon: true } },
          toAccount: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
      });

      // 1b. Jika TRANSFER dan ada admin fee, catat sebagai pengeluaran terpisah
      if (body.type === "TRANSFER" && body.adminFee && body.adminFee > 0) {
        await tx.transaction.create({
          data: {
            amount: body.adminFee,
            type: "EXPENSE",
            description: `Biaya Admin Transfer${body.description ? " (" + body.description + ")" : ""}`,
            date: body.date ? new Date(body.date) : new Date(),
            isSynced: false,
            userId: userId,
            accountId: body.accountId,
          },
        });
      }

      // 2. Update Saldo dengan logika Uang Goib
      const account = await tx.account.findUnique({
        where: { id: body.accountId },
      });
      if (!account) throw new Error("Akun sumber tidak ditemukan");

      if (body.type === "INCOME") {
        await handleIncomingFunds(
          tx,
          account.id,
          account.uangGoib,
          body.amount,
        );
      } else if (body.type === "EXPENSE") {
        await handleOutgoingFunds(tx, account.id, account.balance, body.amount);
      } else if (body.type === "TRANSFER" && body.toAccountId) {
        const totalOut = body.amount + (body.adminFee ?? 0);
        await handleOutgoingFunds(tx, account.id, account.balance, totalOut);

        const targetAccount = await tx.account.findUnique({
          where: { id: body.toAccountId },
        });
        if (!targetAccount) throw new Error("Akun tujuan tidak ditemukan");

        await handleIncomingFunds(
          tx,
          targetAccount.id,
          targetAccount.uangGoib,
          body.amount,
        );
      }

      return transaction;
    },
    { maxWait: 10000, timeout: 20000 },
  );
}

// ─── Helper: Uang Goib-aware balance operations ───────────────

async function handleIncomingFunds(
  tx: Prisma.TransactionClient,
  accountId: string,
  accountUangGoib: number,
  amount: number,
) {
  if (accountUangGoib > 0) {
    if (amount > accountUangGoib) {
      await tx.account.update({
        where: { id: accountId },
        data: {
          uangGoib: 0,
          balance: { increment: amount - accountUangGoib },
        },
      });
    } else {
      await tx.account.update({
        where: { id: accountId },
        data: { uangGoib: { decrement: amount } },
      });
    }
  } else {
    await tx.account.update({
      where: { id: accountId },
      data: { balance: { increment: amount } },
    });
  }
}

async function handleOutgoingFunds(
  tx: Prisma.TransactionClient,
  accountId: string,
  currentBalance: number,
  amount: number,
) {
  const deductible = Math.min(amount, currentBalance);
  const goibAddition = amount - deductible;
  await tx.account.update({
    where: { id: accountId },
    data: {
      balance: { decrement: deductible },
      uangGoib: { increment: goibAddition },
    },
  });
}

// ─── Delete Transaction (Uang Goib-aware reversal) ────────────

export async function deleteTransaction(
  userId: string,
  transactionId: string,
  existingTx: ExistingTransaction,
) {
  return await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Reverse the balance changes made by the original transaction.
      // EXPENSE originally took money out → reversal brings money back in (incoming)
      // INCOME originally brought money in → reversal takes money out (outgoing)
      if (existingTx.type === "EXPENSE") {
        const account = await tx.account.findUnique({ where: { id: existingTx.accountId } });
        if (account) {
          await handleIncomingFunds(tx, account.id, account.uangGoib, existingTx.amount);
        }
      } else if (existingTx.type === "INCOME") {
        const account = await tx.account.findUnique({ where: { id: existingTx.accountId } });
        if (account) {
          await handleOutgoingFunds(tx, account.id, account.balance, existingTx.amount);
        }
      } else if (existingTx.type === "TRANSFER") {
        // Reverse source: money comes back (incoming)
        const sourceAccount = await tx.account.findUnique({ where: { id: existingTx.accountId } });
        if (sourceAccount) {
          const totalOut = existingTx.amount + (existingTx.adminFee || 0);
          await handleIncomingFunds(tx, sourceAccount.id, sourceAccount.uangGoib, totalOut);
        }
        // Reverse destination: money leaves (outgoing)
        if (existingTx.toAccountId) {
          const destAccount = await tx.account.findUnique({ where: { id: existingTx.toAccountId } });
          if (destAccount) {
            await handleOutgoingFunds(tx, destAccount.id, destAccount.balance, existingTx.amount);
          }
        }
      }

      // Soft delete the transaction
      await tx.transaction.update({
        where: { id: transactionId },
        data: { deletedAt: new Date() },
      });

      return true;
    },
    { maxWait: 10000, timeout: 20000 },
  );
}

// ─── Update Transaction (Uang Goib-aware diff) ───────────────

export async function updateTransaction(
  userId: string,
  transactionId: string,
  body: UpdateTransactionPayload,
  existingTx: ExistingTransaction,
) {
  return await db.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Handle balance diff if amount changed
      if (body.amount !== undefined && body.amount !== existingTx.amount) {
        const diff = body.amount - existingTx.amount;

        if (existingTx.type === "EXPENSE") {
          // Expense increased → more money out (outgoing diff)
          // Expense decreased → money comes back (incoming |diff|)
          const account = await tx.account.findUnique({ where: { id: existingTx.accountId } });
          if (account) {
            if (diff > 0) {
              // More money going out
              await handleOutgoingFunds(tx, account.id, account.balance, diff);
            } else {
              // Money coming back
              await handleIncomingFunds(tx, account.id, account.uangGoib, Math.abs(diff));
            }
          }
        } else if (existingTx.type === "INCOME") {
          // Income increased → more money in (incoming diff)
          // Income decreased → money goes out (outgoing |diff|)
          const account = await tx.account.findUnique({ where: { id: existingTx.accountId } });
          if (account) {
            if (diff > 0) {
              // More money coming in
              await handleIncomingFunds(tx, account.id, account.uangGoib, diff);
            } else {
              // Money going out
              await handleOutgoingFunds(tx, account.id, account.balance, Math.abs(diff));
            }
          }
        }
        // Note: TRANSFER amount changes are blocked at the route level
      }

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (body.amount !== undefined) updateData.amount = body.amount;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
      if (body.date !== undefined) updateData.date = new Date(body.date);
      if (body.tags !== undefined) updateData.tags = body.tags || null;

      const updated = await tx.transaction.update({
        where: { id: transactionId },
        data: updateData,
        include: {
          account: { select: { id: true, name: true, icon: true, color: true } },
          category: { select: { id: true, name: true, icon: true } },
          toAccount: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
      });

      return updated;
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
