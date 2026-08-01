import { NextResponse } from "next/server";

import { registerWithPassword } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * Creating an account with a password.
 *
 * Needs no SMS provider — the phone names the account, and proving it is yours
 * is a separate step that produces the verified badge.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) return NextResponse.json({ error: "noDatabase" }, { status: 503 });

  let body: { phone?: unknown; name?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (
    typeof body.phone !== "string" ||
    typeof body.name !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result = await registerWithPassword(body.phone, body.name, body.password);
  if (result.ok) return NextResponse.json({ user: result.user }, { status: 201 });

  return NextResponse.json(
    { error: result.reason },
    { status: result.reason === "alreadyRegistered" ? 409 : 422 },
  );
}
