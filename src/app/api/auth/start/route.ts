import { NextResponse } from "next/server";

import { startSignIn } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * Step one: send a code to a phone number.
 *
 * A number with no account is answered with `nameRequired`, which does reveal
 * that it is unregistered. That is a deliberate trade: unifying sign-in and
 * sign-up means the server has to say which one is happening, and the client
 * turns it into "you have not registered yet" rather than an error. Enumeration
 * resistance is not worth much here anyway — sellers publish their numbers on
 * their own listings.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) {
    return NextResponse.json({ error: "noDatabase" }, { status: 503 });
  }

  let body: { phone?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body.phone !== "string") {
    return NextResponse.json({ error: "invalidPhone" }, { status: 422 });
  }

  const result = await startSignIn(
    body.phone,
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
    result.reason === "unavailable"
      ? 503
      : result.reason === "tooSoon" || result.reason === "tooMany"
        ? 429
        : 422;

  return NextResponse.json(
    { error: result.reason, retryAfterSeconds: result.retryAfterSeconds },
    { status },
  );
}
