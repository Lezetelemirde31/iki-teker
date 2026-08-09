import { NextResponse } from "next/server";

import { checkRegistration, startEmailSignIn } from "@/server/auth";
import { useDatabase } from "@/server/source";

/**
 * The registration form, checked and then sent a code.
 *
 * Both in one request so nobody fills in five fields, waits for a message,
 * types the code, and only then learns the address was already taken.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) {
    return NextResponse.json({ error: "noDatabase" }, { status: 503 });
  }

  let body: {
    email?: unknown;
    name?: unknown;
    phone?: unknown;
    password?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (
    typeof body.email !== "string" ||
    typeof body.name !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const checked = await checkRegistration({
    email: body.email,
    name: body.name,
    password: body.password,
    ...(typeof body.phone === "string" ? { phone: body.phone } : {}),
  });

  if (!checked.ok) return NextResponse.json({ error: checked.reason }, { status: 422 });

  // Nothing is written yet. The account appears when the code comes back.
  const sent = await startEmailSignIn(body.email);
  if (sent.ok) {
    return NextResponse.json({ masked: sent.masked, expiresInSeconds: sent.expiresInSeconds, devCode: sent.devCode });
  }

  const status =
    sent.reason === "undeliverable"
      ? 503
      : sent.reason === "tooSoon" || sent.reason === "tooMany"
        ? 429
        : 422;
  return NextResponse.json(
    { error: sent.reason, retryAfterSeconds: sent.retryAfterSeconds },
    { status },
  );
}
