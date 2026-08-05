import { NextResponse } from "next/server";

import { getThread } from "@/server/data";
import { markRead } from "@/server/messaging";
import { currentUserId } from "@/server/session";

/**
 * New messages since a given moment.
 *
 * Polling rather than a socket. A socket needs a process that stays up, which a
 * serverless deployment is not, and faking one needs a paid service. A request
 * every few seconds while a thread is actually open is a handful of queries a
 * minute per open conversation — cheap enough to be the right answer at this
 * size, and replaceable later without touching the screen.
 *
 * Opening the thread also marks the other side's messages read, so the badge
 * clears where it was genuinely cleared: by someone looking at them.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await currentUserId();

  const thread = await getThread(id, userId);
  if (!thread) return NextResponse.json({ error: "notFound" }, { status: 404 });

  // A thread id is guessable and the conversation is private.
  if (!thread.participantIds.includes(userId)) {
    return NextResponse.json({ error: "notParticipant" }, { status: 403 });
  }

  const since = new URL(request.url).searchParams.get("since");
  const fresh = since
    ? thread.messages.filter((message) => message.createdAt > since)
    : thread.messages;

  // Only worth a write when something actually arrived from the other side.
  if (fresh.some((message) => message.authorId !== userId)) {
    void markRead(id, userId);
  }

  return NextResponse.json({
    messages: fresh,
    contactRevealed: thread.contactRevealed,
  });
}
