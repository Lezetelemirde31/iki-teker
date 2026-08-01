import { NextResponse } from "next/server";

import { signOut } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * Ends the session.
 *
 * POST rather than GET: a link prefetcher or an image tag pointing at a GET
 * would sign people out by accident.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  if (useDatabase) await signOut();
  return NextResponse.json({ ok: true });
}
