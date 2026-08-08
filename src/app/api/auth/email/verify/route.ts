import { NextResponse } from "next/server";

import { completeEmailSignIn } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * Step two: exchange the emailed code for a session.
 *
 * A correct code both signs an existing account in and creates one when there
 * is none, because from the person's side those are the same act: they typed
 * their address and proved they read it.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) {
    return NextResponse.json({ error: "noDatabase" }, { status: 503 });
  }

  let body: {
    email?: unknown;
    code?: unknown;
    name?: unknown;
    phone?: unknown;
    password?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Only used when the address turns out to have no account yet; an existing
  // one ignores all three.
  const result = await completeEmailSignIn(body.email, body.code, {
    name: typeof body.name === "string" ? body.name : "",
    ...(typeof body.phone === "string" ? { phone: body.phone } : {}),
    ...(typeof body.password === "string" ? { password: body.password } : {}),
  });

  if (result.ok) {
    return NextResponse.json({ user: result.user, created: result.created });
  }

  const status = result.reason === "unavailable" ? 503 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
