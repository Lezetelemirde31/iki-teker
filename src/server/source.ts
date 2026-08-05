import "server-only";

/**
 * Which data source the app reads from.
 *
 * The database is used only when it is explicitly available: a hosted server
 * via `DATABASE_URL`, or the embedded engine via `USE_LOCAL_DB=1` during
 * development. Everywhere else the seeded mock dataset is used instead.
 *
 * That default matters. The deployment has no database attached yet, and
 * PGlite writes to the filesystem — on a serverless host it would start empty
 * on every cold start and the site would render as though the catalogue had
 * been wiped. Falling back to mocks means the live demo keeps working
 * untouched while the database path is built and tested behind it, and
 * attaching a real database later is a single environment variable.
 */
/**
 * `USE_LOCAL_DB=1` wins over `DATABASE_URL`, deliberately.
 *
 * Next loads `.env.local` on its own, and that is where a developer's hosted
 * connection string lives. Without this precedence, asking for the embedded
 * database gets you the production one — silently, because both answers look
 * identical until something is written. Every test run I made against a
 * "local" server on 3 August 2026 went to the live database that way, and the
 * writes it left behind are what made a later run look like a regression.
 *
 * The explicit flag is the one someone typed on purpose, so it decides.
 */
export const useLocalDatabase = process.env.USE_LOCAL_DB === "1";

export const useDatabase = useLocalDatabase || Boolean(process.env.DATABASE_URL);

/** Reported in the admin/debug surfaces so the active source is never a guess. */
export const dataSource = !useDatabase ? "mocks" : useLocalDatabase ? "pglite" : "postgres";
