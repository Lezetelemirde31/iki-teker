import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import type { CatalogItem, ListingStatus } from "@/types";

import { withNames } from "./db-queries";
import { mapCatalogItem } from "./mappers";
import { useDatabase } from "./source";

/**
 * A listing after it is published: taking it down, marking it sold, and
 * counting what it produced.
 *
 * Creating a listing without being able to withdraw it is not a feature, it is
 * a trap — a wrong price or a sold motorcycle would sit there forever, wasting
 * every buyer who calls about it.
 *
 * The counters matter for a different reason. The business model in the deck is
 * paid promotion, and what a seller is buying is contacts: the number of people
 * who asked for their phone number. A promotion price cannot be justified
 * against a number that never moves.
 */

export type ActionFailure = "notFound" | "notOwner" | "invalidStatus";
export type ActionResult = { ok: true } | { ok: false; reason: ActionFailure };

/** Statuses a seller may set. Moderation and drafts are not theirs to assign. */
const sellerStatuses: ListingStatus[] = ["active", "sold", "archived"];

/* -------------------------------------------------------------------------- */
/*  Lifecycle                                                                  */
/* -------------------------------------------------------------------------- */

export async function setListingStatus(
  listingId: string,
  sellerId: string,
  status: string,
): Promise<ActionResult> {
  if (!sellerStatuses.includes(status as ListingStatus)) {
    return { ok: false, reason: "invalidStatus" };
  }
  if (!useDatabase) return { ok: false, reason: "notFound" };

  const row = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
    columns: { id: true, sellerId: true },
  });
  if (!row) return { ok: false, reason: "notFound" };
  if (row.sellerId !== sellerId) return { ok: false, reason: "notOwner" };

  await db
    .update(schema.listings)
    .set({ status: status as ListingStatus })
    .where(eq(schema.listings.id, listingId));

  return { ok: true };
}

/**
 * Removes a listing.
 *
 * Archiving is offered alongside this in the UI because deleting is
 * irreversible and a seller who relists the same motorcycle next season would
 * rather not retype it. Both are kept: some people genuinely want it gone.
 */
export async function deleteListing(listingId: string, sellerId: string): Promise<ActionResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };

  const row = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
    columns: { id: true, sellerId: true },
  });
  if (!row) return { ok: false, reason: "notFound" };
  if (row.sellerId !== sellerId) return { ok: false, reason: "notOwner" };

  await db.delete(schema.listings).where(eq(schema.listings.id, listingId));
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*  A seller's own view of their listings                                      */
/* -------------------------------------------------------------------------- */

export type OwnListing = {
  item: CatalogItem;
  /** Present only when the listing was turned down. */
  rejection?: { reason: string; note: string | null };
};

/**
 * Everything a seller has posted, in every status.
 *
 * The public profile shows active listings only, which is right for a buyer and
 * useless for the seller: after moderation was introduced, someone could publish
 * a listing and have nowhere to see what happened to it. A listing waiting for
 * review with no sign of it anywhere reads as lost work.
 *
 * Ordered with the ones needing attention first — rejected, then queued, then
 * everything else — because that is the order a seller can act on.
 */
export async function ownListings(sellerId: string): Promise<OwnListing[]> {
  if (!useDatabase) return [];

  const rows = await db.query.listings.findMany({
    where: eq(schema.listings.sellerId, sellerId),
    orderBy: desc(schema.listings.publishedAt),
  });
  if (rows.length === 0) return [];

  // One query for every rejection rather than one per listing.
  const rejectedIds = rows.filter((row) => row.status === "draft").map((row) => row.id);
  const decisions = rejectedIds.length
    ? await db
        .select()
        .from(schema.moderationActions)
        .where(
          and(
            inArray(schema.moderationActions.listingId, rejectedIds),
            eq(schema.moderationActions.action, "reject"),
          ),
        )
        .orderBy(desc(schema.moderationActions.createdAt))
    : [];

  const latest = new Map<string, (typeof decisions)[number]>();
  for (const decision of decisions) {
    if (!latest.has(decision.listingId)) latest.set(decision.listingId, decision);
  }

  const rank: Record<string, number> = {
    draft: 0,
    moderation: 1,
    active: 2,
    sold: 3,
    archived: 4,
  };

  return rows
    .map((row) => {
      const decision = latest.get(row.id);
      return {
        item: withNames(mapCatalogItem(row)),
        rejection:
          row.status === "draft" && decision?.reason
            ? { reason: decision.reason, note: decision.note }
            : undefined,
      };
    })
    .sort((a, b) => (rank[a.item.status] ?? 9) - (rank[b.item.status] ?? 9));
}

/* -------------------------------------------------------------------------- */
/*  Counters                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A view, incremented in the database rather than read-modify-written, so two
 * people opening the same listing at once cannot lose one of the counts.
 *
 * The seller's own visits do not count. They will open their listing more than
 * anyone, and a view count inflated by its own author tells them nothing about
 * whether the promotion they paid for worked.
 */
export async function recordView(listingId: string, viewerId: string): Promise<void> {
  if (!useDatabase) return;

  await db
    .update(schema.listings)
    .set({ views: sql`${schema.listings.views} + 1` })
    .where(
      and(
        eq(schema.listings.id, listingId),
        sql`${schema.listings.sellerId} <> ${viewerId}`,
      ),
    );
}

/** A phone-number reveal — the metric promotion is actually sold against. */
export async function recordContact(listingId: string, viewerId: string): Promise<number | null> {
  if (!useDatabase) return null;

  // Two statements rather than an UPDATE … RETURNING: `db` is a union of two
  // drivers, and their `returning` overloads do not agree. The increment is
  // still atomic, which is the part that matters — the read afterwards is only
  // for the number shown back to the buyer.
  await db
    .update(schema.listings)
    .set({ contacts: sql`${schema.listings.contacts} + 1` })
    .where(
      and(
        eq(schema.listings.id, listingId),
        sql`${schema.listings.sellerId} <> ${viewerId}`,
      ),
    );

  const row = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
    columns: { contacts: true },
  });

  return row?.contacts ?? null;
}
