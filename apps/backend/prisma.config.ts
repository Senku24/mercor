import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile();

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./prisma/contract.prisma",
    db: {
      // Migrations use the direct (non-pooled) connection when provided.
      connection: (process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"])!,
    },
  }),
});
