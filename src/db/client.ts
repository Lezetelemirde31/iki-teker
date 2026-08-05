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
  // Matches `useDatabase`'s precedence: an explicit USE_LOCAL_DB=1 means the
  // embedded engine even when a connection string is sitting in .env.local.
  // Disagreeing here would connect to one database while the rest of the app
  // believed it was talking to the other.
  const url = process.env.USE_LOCAL_DB === "1" ? undefined : process.env.DATABASE_URL;

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

function database(): Database {
  const existing = globalForDb.__ikiDb;
  if (existing) return existing;

  const created = createDatabase();
  // Cached in every environment, not just development: a serverless instance
  // that handles two requests should not open two connections.
  globalForDb.__ikiDb = created;
  return created;
}

/**
 * Resolved on first use rather than on import.
 *
 * The deployed demo runs on mocks, and PGlite is a WebAssembly Postgres that
 * boots and writes to disk the moment it is constructed. Instantiating it at
 * import time meant every serverless cold start — and every production build —
 * paid for a database nothing was going to query, on a filesystem it could not
 * write to. Nothing here starts until something actually reads from it.
 */
export const db: Database = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const actual = database();
    const value = Reflect.get(actual as object, property, receiver);
    return typeof value === "function" ? value.bind(actual) : value;
  },
  has(_target, property) {
    return Reflect.has(database() as object, property);
  },
});

/** True when running on the embedded engine, which a few admin paths care about. */
export const isEmbedded = !process.env.DATABASE_URL;

export { schema };
