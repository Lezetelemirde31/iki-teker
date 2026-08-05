import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import type { Message } from "@/types";

import { getListing, getUser } from "./data";
import { notify } from "./notifications";
import { useDatabase } from "./source";

/**
 * Sending messages, and opening the thread a message belongs to.
 *
 * Chat is the only channel between a buyer and a seller before money changes
 * hands, and for a rental it is also the record: in a dispute over a scratch or
 * a late return, this history is the only evidence either side has. So messages
 * are stored, not simulated.
 *
 * Contact details stay hidden until a booking is confirmed. That is a business
 * rule, not a technical one — if the parties swap phone numbers on first
 * contact the deal leaves the platform and the platform earns nothing.
 */

export type MessageFailure = "notFound" | "notParticipant" | "empty" | "tooLong" | "ownListing";

export type SendResult = { ok: true; message: Message } | { ok: false; reason: MessageFailure };

export type ThreadResult = { ok: true; threadId: string } | { ok: false; reason: MessageFailure };

const MAX_BODY = 2000;

/* -------------------------------------------------------------------------- */
/*  Opening a conversation                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The thread between a buyer and a seller about one listing.
 *
 * Returns the existing thread if there is one. Two people talking about the
 * same motorcycle should be in one conversation, not a new one per tap of
 * "message seller" — otherwise the history that matters gets scattered.
 */
export async function openThread(listingId: string, userId: string): Promise<ThreadResult> {
  const listing = await getListing(listingId);
  if (!listing) return { ok: false, reason: "notFound" };
  if (listing.sellerId === userId) return { ok: false, reason: "ownListing" };

  if (!useDatabase) return { ok: false, reason: "notFound" };

  // Both participants, same listing — the pair is what makes it the same
  // conversation, so it is matched on rather than created blindly.
  const existing = await db
    .select({ id: schema.chatThreads.id })
    .from(schema.chatThreads)
    .innerJoin(
      schema.chatParticipants,
      eq(schema.chatParticipants.threadId, schema.chatThreads.id),
    )
    .where(
      and(
        eq(schema.chatThreads.listingId, listingId),
        inArray(schema.chatParticipants.userId, [userId, listing.sellerId]),
      ),
    )
    .groupBy(schema.chatThreads.id)
    .having(sql`count(distinct ${schema.chatParticipants.userId}) = 2`);

  const found = existing[0]?.id;
  if (found) return { ok: true, threadId: found };

  const threadId = `th-${crypto.randomUUID().slice(0, 8)}`;
  await db.insert(schema.chatThreads).values({
    id: threadId,
    listingId,
    contactRevealed: false,
    archived: false,
    updatedAt: new Date(),
  });
  await db
    .insert(schema.chatParticipants)
    .values([
      { threadId, userId },
      { threadId, userId: listing.sellerId },
    ]);

  return { ok: true, threadId };
}

/* -------------------------------------------------------------------------- */
/*  Sending                                                                    */
/* -------------------------------------------------------------------------- */

export async function sendMessage(
  threadId: string,
  authorId: string,
  body: string,
): Promise<SendResult> {
  const text = body.trim();
  if (!text) return { ok: false, reason: "empty" };
  if (text.length > MAX_BODY) return { ok: false, reason: "tooLong" };

  if (!useDatabase) return { ok: false, reason: "notFound" };

  const thread = await db.query.chatThreads.findFirst({
    where: eq(schema.chatThreads.id, threadId),
  });
  if (!thread) return { ok: false, reason: "notFound" };

  // Anyone can guess a thread id; only the two people in it may write to it.
  const participant = await db.query.chatParticipants.findFirst({
    where: and(
      eq(schema.chatParticipants.threadId, threadId),
      eq(schema.chatParticipants.userId, authorId),
    ),
  });
  if (!participant) return { ok: false, reason: "notParticipant" };

  const message = {
    id: `m-${crypto.randomUUID().slice(0, 8)}`,
    threadId,
    authorId,
    kind: "text" as const,
    body: text,
    readByRecipient: false,
    createdAt: new Date(),
  };

  await db.insert(schema.messages).values(message);

  // The inbox is ordered by this, so a thread with a new message has to rise.
  await db
    .update(schema.chatThreads)
    .set({ updatedAt: message.createdAt })
    .where(eq(schema.chatThreads.id, threadId));

  // Everyone in the thread except the person who just typed it.
  const others = await db
    .select({ userId: schema.chatParticipants.userId })
    .from(schema.chatParticipants)
    .where(
      and(
        eq(schema.chatParticipants.threadId, threadId),
        sql`${schema.chatParticipants.userId} <> ${authorId}`,
      ),
    );

  const author = await getUser(authorId);
  for (const other of others) {
    void notify(other.userId, "messageReceived", {
      sender: author?.name ?? "",
      // Enough to decide whether to open it, not the whole message on a lock
      // screen someone else might be looking at.
      preview: text.length > 80 ? `${text.slice(0, 80)}…` : text,
      threadId,
    });
  }

  return {
    ok: true,
    message: {
      id: message.id,
      threadId,
      authorId,
      kind: "text",
      body: text,
      readByRecipient: false,
      createdAt: message.createdAt.toISOString(),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Reading                                                                    */
/* -------------------------------------------------------------------------- */

/** Marks the other side's messages as read. Called when a thread is opened. */
export async function markRead(threadId: string, readerId: string): Promise<void> {
  if (!useDatabase) return;
  await db
    .update(schema.messages)
    .set({ readByRecipient: true })
    .where(
      and(
        eq(schema.messages.threadId, threadId),
        sql`${schema.messages.authorId} <> ${readerId}`,
      ),
    );
}
