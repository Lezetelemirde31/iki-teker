import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import type { Message } from "@/types";

import { getListing, getUser } from "./data";
import { notify } from "./notifications";
import { useDatabase } from "./source";
import { isSafeKey, publicUrl, uploadPrefix } from "./storage";

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
  await touchThread(threadId, message.createdAt);

  const author = await getUser(authorId);
  for (const other of await othersIn(threadId, authorId)) {
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
/*  Sending a photo                                                            */
/* -------------------------------------------------------------------------- */

export type ImageMessage = {
  key: string;
  fileName: string;
  fileSize: string;
  width?: number;
  height?: number;
};

/**
 * A photo in the conversation.
 *
 * Half of what gets asked in a used-motorcycle chat is "send a picture of the
 * chain", "show me the service book", "what does the scratch look like". Before
 * this the answer was a WhatsApp number — which is the platform losing the deal
 * it was built to hold.
 *
 * The bytes never pass through here. The browser uploads them straight to
 * storage and then sends this message naming the object, so a five-megabyte
 * photo does not have to fit through a serverless request body.
 */
export async function sendImage(
  threadId: string,
  authorId: string,
  image: ImageMessage,
): Promise<SendResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };

  // The key is claimed by the client, so it is checked rather than trusted: a
  // participant may only attach an object that was uploaded into this thread's
  // own prefix, which is the shape `/api/uploads` hands out.
  if (!isSafeKey(image.key) || !image.key.startsWith(`${uploadPrefix(threadId)}/`)) {
    return { ok: false, reason: "empty" };
  }

  const participant = await db.query.chatParticipants.findFirst({
    where: and(
      eq(schema.chatParticipants.threadId, threadId),
      eq(schema.chatParticipants.userId, authorId),
    ),
  });
  if (!participant) return { ok: false, reason: "notParticipant" };

  const row = {
    id: `m-${crypto.randomUUID().slice(0, 8)}`,
    threadId,
    authorId,
    kind: "image" as const,
    fileName: image.fileName.slice(0, 120),
    fileSize: image.fileSize,
    storageKey: image.key,
    imageWidth: image.width ?? null,
    imageHeight: image.height ?? null,
    readByRecipient: false,
    createdAt: new Date(),
  };

  await db.insert(schema.messages).values(row);
  await touchThread(threadId, row.createdAt);

  const author = await getUser(authorId);
  for (const other of await othersIn(threadId, authorId)) {
    void notify(other.userId, "messageReceived", {
      sender: author?.name ?? "",
      preview: "📷",
      threadId,
    });
  }

  return {
    ok: true,
    message: {
      id: row.id,
      threadId,
      authorId,
      kind: "image",
      fileName: row.fileName,
      fileSize: row.fileSize,
      url: publicUrl(image.key),
      width: image.width,
      height: image.height,
      readByRecipient: false,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  Shared by both kinds of send                                               */
/* -------------------------------------------------------------------------- */

/**
 * The inbox is ordered by `updatedAt`, so anything new has to lift the thread;
 * and a conversation somebody is being written to does not belong in an
 * archive, because a message in a hidden thread is a message nobody answers.
 */
async function touchThread(threadId: string, at: Date) {
  await db
    .update(schema.chatThreads)
    .set({ updatedAt: at })
    .where(eq(schema.chatThreads.id, threadId));

  await db
    .update(schema.chatParticipants)
    .set({ archived: false })
    .where(eq(schema.chatParticipants.threadId, threadId));
}

/** Everyone in the thread except the person who just sent something. */
async function othersIn(threadId: string, authorId: string) {
  return db
    .select({ userId: schema.chatParticipants.userId })
    .from(schema.chatParticipants)
    .where(
      and(
        eq(schema.chatParticipants.threadId, threadId),
        sql`${schema.chatParticipants.userId} <> ${authorId}`,
      ),
    );
}

/* -------------------------------------------------------------------------- */
/*  Archiving                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Puts a finished conversation out of the way.
 *
 * Not a delete. The other person keeps their copy, and for a rental this
 * history is the only evidence either side has if something is disputed later —
 * so archiving hides a thread from one inbox and destroys nothing.
 *
 * A new message brings it back. Someone who archived a conversation and then
 * gets written to has not stopped being in that conversation, and a message
 * that lands in a hidden thread is a message nobody answers.
 */
export async function setArchived(
  threadId: string,
  userId: string,
  archived: boolean,
): Promise<{ ok: true } | { ok: false; reason: MessageFailure }> {
  if (!useDatabase) return { ok: false, reason: "notFound" };

  const participant = await db.query.chatParticipants.findFirst({
    where: and(
      eq(schema.chatParticipants.threadId, threadId),
      eq(schema.chatParticipants.userId, userId),
    ),
  });
  if (!participant) return { ok: false, reason: "notParticipant" };

  // Only this person's row. The other side's inbox is not theirs to tidy.
  await db
    .update(schema.chatParticipants)
    .set({ archived })
    .where(
      and(
        eq(schema.chatParticipants.threadId, threadId),
        eq(schema.chatParticipants.userId, userId),
      ),
    );

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  Unlocking contact details                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Opens the phone number once a booking is confirmed.
 *
 * The rule is that contact stays hidden until there is a real transaction —
 * otherwise the two of them swap numbers on first contact and the deal leaves
 * the platform. A confirmed booking *is* that transaction, and at that point
 * hiding the number is no longer protecting the business, it is stopping the
 * renter finding the person handing them a motorcycle tomorrow.
 *
 * The thread is found by listing and renter rather than stored on the booking,
 * because the conversation usually starts before the booking exists.
 */
export async function revealContactForBooking(
  listingId: string,
  renterId: string,
  bookingId: string,
): Promise<void> {
  if (!useDatabase) return;

  const threads = await db
    .select({ id: schema.chatThreads.id })
    .from(schema.chatThreads)
    .innerJoin(
      schema.chatParticipants,
      eq(schema.chatParticipants.threadId, schema.chatThreads.id),
    )
    .where(
      and(
        eq(schema.chatThreads.listingId, listingId),
        eq(schema.chatParticipants.userId, renterId),
      ),
    );

  if (threads.length === 0) return;

  await db
    .update(schema.chatThreads)
    .set({ contactRevealed: true, bookingId })
    .where(
      inArray(
        schema.chatThreads.id,
        threads.map((thread) => thread.id),
      ),
    );
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
