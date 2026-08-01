import { NextResponse } from "next/server";

import { signInWithPassword } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * Signing in with a password.
 *
 * A wrong password and an unknown number answer the same way, and take the same
 * time, so the form cannot be used to find out which numbers have accounts.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) return NextResponse.json({ error: "noDatabase" }, { status: 503 });

  let body: { phone?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body.phone !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result = await signInWithPassword(body.phone, body.password);
  if (result.ok) return NextResponse.json({ user: result.user });

  return NextResponse.json(
    { error: result.reason },
    { status: result.reason === "locked" ? 429 : 401 },
  );
}
