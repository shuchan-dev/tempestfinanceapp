import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { CreateTransactionPayload } from "@/types";

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

// -- Helper utilities for shared account balance logic --

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
