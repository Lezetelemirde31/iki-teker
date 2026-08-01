import { NextResponse } from "next/server";

import { completeSignIn } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * Step two: exchange a code for a session.
 *
 * A correct code both signs an existing user in and creates the account when
 * there is not one, because from the user's side those are the same act: they
 * typed their number and proved it is theirs.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) {
    return NextResponse.json({ error: "noDatabase" }, { status: 503 });
  }

  let body: { phone?: unknown; code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body.phone !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result = await completeSignIn(body.phone, body.code);

  if (result.ok) {
    return NextResponse.json({ user: result.user, created: result.created });
  }

  const status = result.reason === "unavailable" ? 503 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
