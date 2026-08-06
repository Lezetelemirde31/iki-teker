import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { useDatabase } from "./source";
import { uploadPrefix } from "./storage";

/**
 * What may be uploaded, and where it is allowed to land.
 *
 * Separate from both the route and the storage adapter because it is the part
 * that is actually a decision: the route only unpacks JSON, and the adapter
 * only knows how to sign a URL. Deciding whether this person may put this file
 * into this conversation is the rule worth keeping in one readable place.
 */

/** Photos from a phone, and the formats a phone actually produces. */
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

/**
 * Ten megabytes.
 *
 * A modern phone photo is two to five, so this fits one without thinking while
 * still refusing a video somebody renamed. It is checked again by the signature
 * only loosely — storage will accept whatever is PUT — so the honest limit is
 * this one, applied before a URL is ever handed out.
 */
const MAX_BYTES = 10 * 1024 * 1024;

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export type UploadDecision =
  | { ok: true; key: string }
  | { ok: false; reason: "notParticipant" | "unsupportedType" | "tooLarge" | "notFound" };

export async function canUploadTo(
  threadId: string,
  userId: string,
  contentType: string,
  size: number,
): Promise<UploadDecision> {
  if (!ALLOWED.has(contentType)) return { ok: false, reason: "unsupportedType" };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
    return { ok: false, reason: "tooLarge" };
  }

  if (!useDatabase) return { ok: false, reason: "notFound" };

  // Membership, not existence: a thread id is guessable, and the point of the
  // check is that strangers cannot drop files into someone's conversation.
  const participant = await db.query.chatParticipants.findFirst({
    where: and(
      eq(schema.chatParticipants.threadId, threadId),
      eq(schema.chatParticipants.userId, userId),
    ),
  });
  if (!participant) return { ok: false, reason: "notParticipant" };

  // Named here rather than by the caller. A random name means one upload cannot
  // overwrite another, and the thread prefix is what lets the send path verify
  // that an attached object really belongs to the conversation it is claimed in.
  const name = crypto.randomUUID().replace(/-/g, "");
  return { ok: true, key: `${uploadPrefix(threadId)}/${name}.${EXTENSION[contentType]}` };
}

export const uploadLimits = { maxBytes: MAX_BYTES, allowed: [...ALLOWED] };
