/**
 * Brings a hosted database up to the current schema.
 *
 * Separate from db:seed on purpose. Seeding truncates and reloads the demo
 * dataset; this only creates what is missing. Running it against production is
 * safe, running the seed against production is not.
 *
 *   DATABASE_URL=postgres://… npm run db:migrate
 *
 * Idempotent: every statement is guarded, so it can be run on every deploy.
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

import { applyConstraints, hasOverlapGuard } from "../src/db/bootstrap";
import * as schema from "../src/db/schema";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error(
    [
      "DATABASE_URL is not set.",
      "",
      "This script is for a hosted Postgres. For the embedded development",
      "database, use `npm run db:seed` instead.",
    ].join("\n"),
  );
  process.exit(1);
}

async function main() {
  // One connection, no pooling: this runs once and exits.
  const client = postgres(url!, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  console.log(`connecting to ${redact(url!)}`);
  const [version] = await client`SELECT version()`;
  console.log(`  ${String(version?.version ?? "").split(",")[0]}`);

  /* ---- tables ----------------------------------------------------------- */
  const dir = path.join(process.cwd(), "drizzle");
  const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();

  let applied = 0;
  let skipped = 0;
  for (const file of files) {
    const ddl = await readFile(path.join(dir, file), "utf8");
    for (const statement of ddl.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      try {
        await client.unsafe(trimmed);
        applied++;
      } catch (error) {
        // Re-running against a database that already has the schema is the
        // normal case, not a failure.
        if (/already exists/i.test(String(error))) {
          skipped++;
          continue;
        }
        throw error;
      }
    }
  }
  console.log(`schema: ${applied} statement(s) applied, ${skipped} already present`);

  /* ---- the parts drizzle cannot express --------------------------------- */
  await applyConstraints(db);
  const guarded = await hasOverlapGuard(db);
  console.log(`overlap guard: ${guarded ? "present" : "MISSING"}`);

  if (!guarded) {
    console.error(
      "\nThe no-double-booking guarantee is not in place. This database either" +
        "\nlacks the btree_gist extension or refused to create it.",
    );
    await client.end();
    process.exit(1);
  }

  /* ---- what is in there ------------------------------------------------- */
  const counts = await client<{ table: string; n: string }[]>`
    SELECT relname AS table, n_live_tup::text AS n
    FROM pg_stat_user_tables
    ORDER BY relname
  `;
  console.log("\ntables:");
  for (const row of counts) console.log(`  ${row.table.padEnd(20)} ${row.n.padStart(6)}`);

  await client.end();
  console.log("\nOK — database is at the current schema");
}

/** Never print a password, even into a terminal the user trusts. */
function redact(value: string) {
  return value.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
