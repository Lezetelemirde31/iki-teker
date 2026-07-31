import { sql } from "drizzle-orm";

import type { Database } from "./client";

/**
 * Brings a fresh database up to the current schema.
 *
 * Drizzle's generated DDL covers the tables; this adds the two things it cannot
 * express — the `btree_gist` extension and the booking overlap constraint that
 * depends on it.
 *
 * The overlap guard is the reason the platform can promise that double booking
 * is impossible. An application-level availability check cannot deliver that:
 * two requests arriving in the same instant would both read a free calendar and
 * both write a booking. Only the database, holding a lock over the range, can
 * reject the second one.
 *
 * It covers confirmed and active bookings only. A pending request is not a
 * claim on the dates — several renters may ask for the same window and the
 * owner picks one. Including pending here would mean the first person to tap
 * "request" locked everyone else out of dates nobody had agreed to yet.
 */
export async function applyConstraints(database: Database) {
  // `offer_id WITH =` inside a GiST index needs btree_gist.
  await database.execute(sql`CREATE EXTENSION IF NOT EXISTS btree_gist`);

  await database.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap'
      ) THEN
        ALTER TABLE bookings
          ADD CONSTRAINT bookings_no_overlap
          EXCLUDE USING gist (
            offer_id WITH =,
            daterange(start_date, end_date, '[]') WITH &&
          )
          WHERE (status IN ('confirmed', 'active'));
      END IF;
    END $$;
  `);
}

/**
 * Reports whether the guard is in place — used by the integrity check and by
 * the migration script, which refuses to finish without it.
 *
 * The two drivers disagree about what `execute` returns: PGlite hands back a
 * result object with a `rows` array, postgres-js hands back the array itself.
 * Reading only one shape made a healthy hosted database report its safety
 * constraint as missing, which is the most misleading way this could fail —
 * so both are handled.
 */
export async function hasOverlapGuard(database: Database) {
  const result = await database.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM pg_constraint WHERE conname = 'bookings_no_overlap'`,
  );

  const rows: { count?: string }[] = Array.isArray(result)
    ? result
    : ((result as unknown as { rows?: { count: string }[] }).rows ?? []);

  return Number(rows[0]?.count ?? 0) > 0;
}
