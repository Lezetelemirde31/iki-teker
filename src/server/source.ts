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
export const useDatabase =
  Boolean(process.env.DATABASE_URL) || process.env.USE_LOCAL_DB === "1";

/** Reported in the admin/debug surfaces so the active source is never a guess. */
export const dataSource = useDatabase
  ? process.env.DATABASE_URL
    ? "postgres"
    : "pglite"
  : "mocks";
