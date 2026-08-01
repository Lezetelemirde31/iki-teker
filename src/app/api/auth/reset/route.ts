import { NextResponse } from "next/server";

import { setPassword } from "@/server/auth";
import { currentUser } from "@/server/session";
import { useDatabase } from "@/server/source";

/**
 * Setting a new password.
 *
 * Requires a live session, and the only ways to hold one are knowing the
 * current password or having just entered a code sent to the phone. Both are
 * real proof; a reset that needs neither is how accounts are taken over.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!useDatabase) return NextResponse.json({ error: "noDatabase" }, { status: 503 });

  const session = await currentUser();
  if (!session.authenticated) return NextResponse.json({ error: "notSignedIn" }, { status: 401 });

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body.password !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result = await setPassword(session.userId, body.password);
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: result.reason }, { status: 422 });
}
