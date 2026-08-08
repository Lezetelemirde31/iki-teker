import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import type { CatalogItem, ModerationFlag } from "@/types";

import { canModerate } from "./authorization";
import { lastActionOn, recordAction } from "./audit";
import { mapCatalogItem } from "./mappers";
import { notify } from "./notifications";
import { currentUserId } from "./session";
import { useDatabase } from "./source";

/**
 * The moderation queue.
 *
 * Nothing stands between a scam listing and the catalogue without this, which
 * is why new listings are published as `moderation` rather than `active`.
 *
 * Flags are **computed on read, not stored**. A stored flag goes stale the
 * moment a seller edits their description, and a moderator acting on a stale
 * flag is worse than one acting on none. They are hints that order the queue —
 * the decision is always a person's.
 */

export type RejectionReason =
  | "prohibited"
  | "misleading"
  | "duplicate"
  | "contactInfo"
  | "poorQuality"
  | "wrongCategory"
  | "other";

export type QueueItem = {
  item: CatalogItem;
  sellerName: string;
  sellerVerified: boolean;
  flags: ModerationFlag[];
  submittedAt: string;
};

export type ModerationFailure = "notAllowed" | "notFound" | "notPending" | "reasonRequired";
export type ModerationResult = { ok: true } | { ok: false; reason: ModerationFailure };

const reasons: RejectionReason[] = [
  "prohibited",
  "misleading",
  "duplicate",
  "contactInfo",
  "poorQuality",
  "wrongCategory",
  "other",
];

/* -------------------------------------------------------------------------- */
/*  Reading the queue                                                          */
/* -------------------------------------------------------------------------- */

export async function moderationQueue(limit = 50): Promise<QueueItem[]> {
  if (!useDatabase || !(await canModerate())) return [];

  const rows = await db
    .select({ listing: schema.listings, seller: schema.users })
    .from(schema.listings)
    .innerJoin(schema.users, eq(schema.users.id, schema.listings.sellerId))
    .where(eq(schema.listings.status, "moderation"))
    // Oldest first: the queue is a to-do list, and the listing that has waited
    // longest is the seller closest to giving up on the platform.
    .orderBy(asc(schema.listings.publishedAt))
    .limit(limit);

  return rows.map(({ listing, seller }) => {
    const item = mapCatalogItem(listing);
    return {
      item,
      sellerName: seller.name,
      sellerVerified: seller.phoneVerified,
      flags: flagsFor(item, seller.phoneVerified),
      submittedAt: listing.publishedAt.toISOString(),
    };
  });
}

export async function pendingCount(): Promise<number> {
  if (!useDatabase || !(await canModerate())) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.listings)
    .where(eq(schema.listings.status, "moderation"));
  return row?.n ?? 0;
}

/* -------------------------------------------------------------------------- */
/*  Deciding                                                                   */
/* -------------------------------------------------------------------------- */

export async function approveListing(listingId: string): Promise<ModerationResult> {
  return decide(listingId, "approve", "active");
}

export async function rejectListing(
  listingId: string,
  reason: string,
  note?: string,
): Promise<ModerationResult> {
  if (!reasons.includes(reason as RejectionReason)) {
    return { ok: false, reason: "reasonRequired" };
  }
  // Rejected listings become drafts, not deletions. The seller wrote it, most
  // rejections are fixable, and destroying their work over a missing detail
  // would lose the listing and the seller with it.
  return decide(listingId, "reject", "draft", reason as RejectionReason, note);
}

async function decide(
  listingId: string,
  action: "approve" | "reject",
  status: "active" | "draft",
  reason?: RejectionReason,
  note?: string,
): Promise<ModerationResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };
  if (!(await canModerate())) return { ok: false, reason: "notAllowed" };

  const moderatorId = await currentUserId();

  const row = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
    columns: { id: true, status: true },
  });
  if (!row) return { ok: false, reason: "notFound" };
  // Two moderators opening the same queue is normal; the second one to click
  // must not silently overwrite the first one's decision.
  if (row.status !== "moderation") return { ok: false, reason: "notPending" };

  await db
    .update(schema.listings)
    .set({ status })
    .where(and(eq(schema.listings.id, listingId), eq(schema.listings.status, "moderation")));

  // The seller is waiting on this. Without it they refresh the account screen
  // hoping, which is the experience moderation is most often blamed for.
  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
    columns: { sellerId: true, title: true },
  });

  await recordAction({
    actorId: moderatorId,
    action: action === "approve" ? "approveListing" : "rejectListing",
    entityType: "listing",
    entityId: listingId,
    entityLabel: listing?.title ?? listingId,
    from: "moderation",
    to: status,
    reason: reason ?? null,
    note: note ?? null,
  });

  if (listing) {
    void notify(
      listing.sellerId,
      action === "approve" ? "listingApproved" : "listingRejected",
      { title: listing.title, listingId },
    );
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  What the seller is told                                                    */
/* -------------------------------------------------------------------------- */

/** The most recent decision on a listing, so its seller can see why. */
export async function lastDecision(listingId: string) {
  return lastActionOn("listing", listingId);
}

/* -------------------------------------------------------------------------- */
/*  Flags                                                                      */
/* -------------------------------------------------------------------------- */

/** Words that make a listing not ours to carry. Deliberately short and blunt. */
const banned = [
  "oğurluq",
  "ugurluq",
  "kradenn",
  "краден",
  "stolen",
  "sənədsiz",
  "senedsiz",
  "без документов",
  "no documents",
];

/**
 * A phone number hiding in the description.
 *
 * This is the flag that matters most commercially. Contact details are supposed
 * to unlock through the platform; a number typed into the description routes
 * the whole deal around it, and the platform earns nothing. Matches Azerbaijani
 * mobile shapes with or without spaces, dashes and a country code.
 */
const phonePattern =
  /(\+?994[\s-]?)?(0?(50|51|55|70|77|10|60|99)[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})/;

/** Messenger handles do the same job as a phone number. */
const handlePattern = /\b(whatsapp|wa\.me|telegram|t\.me|instagram|@[a-z0-9._]{4,})\b/i;

function flagsFor(item: CatalogItem, sellerVerified: boolean): ModerationFlag[] {
  const flags: ModerationFlag[] = [];

  const text = Object.values(item.description).join(" ").toLowerCase();

  if (phonePattern.test(text) || handlePattern.test(text)) {
    flags.push("contactInDescription");
  }
  if (banned.some((word) => text.includes(word))) {
    flags.push("bannedWord");
  }
  if (item.photos.length === 0) {
    flags.push("noPhotos");
  }
  if (!sellerVerified) {
    flags.push("unverifiedSeller");
  }
  // A price two orders of magnitude off is nearly always a typo or a bait
  // listing. Narrow on purpose: a wrong flag trains moderators to ignore them.
  if (item.kind === "vehicle" && (item.price < 100 || item.price > 200_000)) {
    flags.push("priceAnomaly");
  }

  return flags;
}
