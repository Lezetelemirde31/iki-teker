import { NextResponse } from "next/server";

import { startEmailSignIn } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * Step one: ask for a code by email.
 *
 * The answer never says whether the address has an account. "Not registered"
 * would turn this form into a way to find out who is on the platform.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) {
    return NextResponse.json({ error: "noDatabase" }, { status: 503 });
  }

  let body: { email?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body.email !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result = await startEmailSignIn(
    body.email,
    typeof body.name === "string" ? body.name : undefined,
  );

  if (result.ok) {
    return NextResponse.json({
      masked: result.masked,
      expiresInSeconds: result.expiresInSeconds,
      devCode: result.devCode,
    });
  }

  const status =
    result.reason === "undeliverable"
      ? 503
      : result.reason === "tooSoon" || result.reason === "tooMany"
        ? 429
        : 422;

  return NextResponse.json(
    { error: result.reason, retryAfterSeconds: result.retryAfterSeconds },
    { status },
  );
}
