import { NextResponse } from "next/server";

import { sendMessage } from "@/server/messaging";
import { currentUserId } from "@/server/session";

/**
 * Sending a message.
 *
 * Membership of the thread is checked server-side: a thread id is guessable,
 * and reading or writing someone else's negotiation is exactly the kind of
 * thing an id-based URL invites.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: unknown;
  try {
    ({ body } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body !== "string") {
    return NextResponse.json({ error: "body must be a string" }, { status: 400 });
  }

  const result = await sendMessage(id, await currentUserId(), body);

  if (result.ok) return NextResponse.json({ message: result.message }, { status: 201 });

  const status =
    result.reason === "notFound" ? 404 : result.reason === "notParticipant" ? 403 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
