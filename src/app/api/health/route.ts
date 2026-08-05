import { NextResponse } from "next/server";

import { db } from "@/db/client";
import { useDatabase } from "@/server/source";

/**
 * Liveness, and a way to keep the database awake.
 *
 * Neon's free plan suspends a database after a few minutes of inactivity and
 * takes around twenty seconds to wake it. That is the whole of the 22-second
 * first page load — not the app. An external pinger hitting this every few
 * minutes keeps the connection alive and the first real visitor of the hour
 * gets a warm database instead of paying for the wake-up.
 *
 * The query is deliberately the cheapest one that still opens a connection.
 * Returning without touching the database would keep Vercel warm and let Neon
 * sleep, which is the half that matters.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  if (!useDatabase) {
    return NextResponse.json({ ok: true, source: "mocks", ms: 0 });
  }

  try {
    await db.execute("SELECT 1");
    return NextResponse.json({ ok: true, source: "postgres", ms: Date.now() - startedAt });
  } catch {
    // A failing database is not a failing deployment — say which is which.
    return NextResponse.json(
      { ok: false, source: "postgres", ms: Date.now() - startedAt },
      { status: 503 },
    );
  }
}
