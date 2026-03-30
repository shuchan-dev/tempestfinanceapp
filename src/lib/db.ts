import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = globalThis as unknown as {
  prisma_v2: PrismaClient | undefined;
  pool_v2: Pool | undefined;
};

/**
 * CRITICAL FIX: Pool dan PrismaClient SELALU disimpan ke globalThis,
 * tidak hanya di development.
 *
 * Di Vercel (production), setiap Serverless Function invocation berbagi
 * process yang sama dalam satu container. Jika tidak disimpan ke global,
 * setiap request akan membuat koneksi baru ke PostgreSQL dan menghabiskan
 * connection pool (menyebabkan error P2024 - connection timeout).
 *
 * Ref: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */
const pool = globalForPrisma.pool_v2 ?? new Pool({ connectionString, max: 5 });
const adapter = new PrismaPg(pool as any);

export const db = globalForPrisma.prisma_v2 ?? new PrismaClient({ adapter });

// Simpan ke global agar tidak di-instantiate ulang (berlaku di dev & production)
globalForPrisma.prisma_v2 = db;
globalForPrisma.pool_v2 = pool;
