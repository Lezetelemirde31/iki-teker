import { NextResponse } from "next/server";

import { setArchived } from "@/server/messaging";
import { currentUserId } from "@/server/session";

/**
 * Archiving a conversation, and bringing it back.
 *
 * Membership is checked in the messaging module rather than here, so it cannot
 * be bypassed by reaching the same function from somewhere else.
 */
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let archived: unknown;
  try {
    ({ archived } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof archived !== "boolean") {
    return NextResponse.json({ error: "archived must be a boolean" }, { status: 400 });
  }

  const result = await setArchived(id, await currentUserId(), archived);
  if (result.ok) return NextResponse.json({ ok: true, archived });

  return NextResponse.json(
    { error: result.reason },
    { status: result.reason === "notParticipant" ? 403 : 404 },
  );
}
