import { NextResponse } from "next/server";

import { signInWithIdentifier } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * Signing in with an address or a number, and a password.
 *
 * One endpoint because the form has one field: which of the two somebody typed
 * is not a decision worth making them make.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) {
    return NextResponse.json({ error: "noDatabase" }, { status: 503 });
  }

  let body: { identifier?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body.identifier !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result = await signInWithIdentifier(body.identifier, body.password);

  if (result.ok) return NextResponse.json({ user: result.user });

  const status = result.reason === "locked" ? 429 : 401;
  return NextResponse.json({ error: result.reason }, { status });
}
