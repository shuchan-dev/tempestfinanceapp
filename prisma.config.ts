import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { PrismaLibSql } from "@prisma/adapter-libsql";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
  adapter: () => {
    return new PrismaLibSql({
      url: env("TURSO_DATABASE_URL"),
      authToken: env("TURSO_AUTH_TOKEN"),
    });
  },
});
