import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = globalThis as unknown as {
  prisma_v2: PrismaClient | undefined;
  pool_v2: Pool | undefined;
};

// Next.js hot reload causes new connections to be instantiated frequently.
// We preserve BOTH the pool and the prisma client on the global scope to prevent
// connection leak and exhausting PostgreSQL connection slots leading to P2028.
const pool = globalForPrisma.pool_v2 ?? new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);

export const db = globalForPrisma.prisma_v2 ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma_v2 = db;
  globalForPrisma.pool_v2 = pool;
}
