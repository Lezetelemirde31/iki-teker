import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import type { ListingStatus } from "@/types";

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
