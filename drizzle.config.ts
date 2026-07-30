import { defineConfig } from "drizzle-kit";

/**
 * Migrations are always generated against Postgres dialect, whether the local
 * engine is PGlite or a hosted server — the SQL has to be identical either way.
 */
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/iki",
  },
  verbose: true,
  strict: true,
});
