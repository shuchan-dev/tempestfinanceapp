import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  return new PrismaClient({ adapter });
}

/**
 * Singleton PrismaClient untuk Turso (libSQL).
 *
 * Di Next.js (dev), hot reload bisa membuat banyak instance baru.
 * Dengan menyimpan ke globalThis, kita memastikan hanya ada 1 instance
 * selama proses berjalan.
 *
 * Ref: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
