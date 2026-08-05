/**
 * `next dev` against the embedded database instead of production.
 *
 * Setting an environment variable inline is shell-specific, and this project is
 * developed on Windows and deployed from Linux — so it is done here, where both
 * behave the same.
 *
 * The flag has to win over `.env.local`, which Next loads itself and which
 * carries the production `DATABASE_URL`. That precedence lives in
 * `src/server/source.ts`; without it, asking for the local database silently
 * gets the live one, which is how test data once reached production.
 */

import { spawn } from "node:child_process";

const child = spawn("npx", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, USE_LOCAL_DB: "1" },
});

child.on("exit", (code) => process.exit(code ?? 0));
