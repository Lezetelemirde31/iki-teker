import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { useDatabase } from "./source";
import { listingPrefix, uploadPrefix } from "./storage";

/**
 * What may be uploaded, and where it is allowed to land.
 *
 * Separate from both the route and the storage adapter because it is the part
 * that is actually a decision: the route only unpacks JSON, and the adapter
 * only knows how to sign a URL. Deciding whether this person may put this file
 * there is the rule worth keeping in one readable place.
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

/**
 * Where a file is going, which is what decides who may put one there.
 *
 * A chat photo belongs to a conversation and only its members may add to it. A
 * listing photo is chosen *before* the listing exists — there is no id to check
 * against yet — so it belongs to the person uploading it, and the listing later
 * claims only the objects filed under that person.
 */
export type UploadTarget = { kind: "chat"; threadId: string } | { kind: "listing" };

export type UploadDecision =
  | { ok: true; key: string }
  | { ok: false; reason: "notParticipant" | "unsupportedType" | "tooLarge" | "notFound" };

export async function canUpload(
  target: UploadTarget,
  userId: string,
  contentType: string,
  size: number,
): Promise<UploadDecision> {
  if (!ALLOWED.has(contentType)) return { ok: false, reason: "unsupportedType" };
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
    return { ok: false, reason: "tooLarge" };
  }

  if (target.kind === "chat") {
    if (!useDatabase) return { ok: false, reason: "notFound" };

    // Membership, not existence: a thread id is guessable, and the point of the
    // check is that strangers cannot drop files into someone's conversation.
    const participant = await db.query.chatParticipants.findFirst({
      where: and(
        eq(schema.chatParticipants.threadId, target.threadId),
        eq(schema.chatParticipants.userId, userId),
      ),
    });
    if (!participant) return { ok: false, reason: "notParticipant" };
  }

  // Named here rather than by the caller. A random name means one upload cannot
  // overwrite another, and the prefix is what lets the claiming path verify an
  // object really belongs where it is being attached.
  const prefix = target.kind === "chat" ? uploadPrefix(target.threadId) : listingPrefix(userId);
  return { ok: true, key: `${prefix}/${crypto.randomUUID().replace(/-/g, "")}.${EXTENSION[contentType]}` };
}

export const uploadLimits = { maxBytes: MAX_BYTES, allowed: [...ALLOWED] };
