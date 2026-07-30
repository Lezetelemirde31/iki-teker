import "server-only";

import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Database connection.
 *
 * Development runs on PGlite — Postgres compiled to WebAssembly, embedded in the
 * process. That means no Docker, no service to install and no hosted account
 * just to work on the schema, while still being real Postgres: `daterange`,
 * exclusion constraints and `jsonb` all behave exactly as they will in
 * production. Setting `DATABASE_URL` switches to a hosted server, and nothing
 * else in the app changes.
 */
export type Database =
  | ReturnType<typeof drizzlePglite<typeof schema>>
  | ReturnType<typeof drizzlePostgres<typeof schema>>;

const DATA_DIR = process.env.PGLITE_DIR ?? "./.pglite";

// Cached on globalThis so Next's dev server does not open a new embedded
// database on every hot reload.
const globalForDb = globalThis as unknown as {
  __ikiDb?: Database;
  __ikiPglite?: PGlite;
};

function createDatabase(): Database {
  const url = process.env.DATABASE_URL;

  if (url) {
    const client = postgres(url, { prepare: false });
    return drizzlePostgres(client, { schema });
  }

  // btree_gist is loaded explicitly: PGlite ships contrib extensions but does
  // not enable them, and the booking overlap constraint cannot be created
  // without it.
  const pglite =
    globalForDb.__ikiPglite ?? new PGlite(DATA_DIR, { extensions: { btree_gist } });
  globalForDb.__ikiPglite = pglite;
  return drizzlePglite(pglite, { schema });
}

export const db: Database = globalForDb.__ikiDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") globalForDb.__ikiDb = db;

/** True when running on the embedded engine, which a few admin paths care about. */
export const isEmbedded = !process.env.DATABASE_URL;

export { schema };
