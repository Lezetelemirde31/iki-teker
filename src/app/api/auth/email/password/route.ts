import { NextResponse } from "next/server";

import { signInWithEmailPassword } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * Signing in with the address and the password set at registration.
 *
 * The quick path back in. "No account" and "wrong password" answer the same
 * way, so this cannot be used to find out which addresses are registered.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) {
    return NextResponse.json({ error: "noDatabase" }, { status: 503 });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result = await signInWithEmailPassword(body.email, body.password);

  if (result.ok) return NextResponse.json({ user: result.user });

  const status = result.reason === "locked" ? 429 : 401;
  return NextResponse.json({ error: result.reason }, { status });
}
