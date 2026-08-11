import "server-only";

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { can } from "./authorization";
import { recordAction } from "./audit";
import { createListing, type ListingDraft } from "./listings";
import { currentUserId } from "./session";
import { useDatabase } from "./source";

/**
 * Listings, from behind the panel.
 *
 * Two things live here that the seller-facing module deliberately does not
 * have: reading every listing whatever its state, and creating one attributed
 * to somebody other than whoever is signed in.
 *
 * That second power is the reason every use of it is written to the audit log
 * with both names. A listing carries a seller's name and, once contact is
 * revealed, their phone number — so "who actually typed this" has to remain
 * answerable after the fact. Staff posting for a seller who telephoned is an
 * ordinary thing for a marketplace to do; doing it invisibly is not.
 */

export type ListingFilter = {
  search?: string;
  status?: string;
  category?: string;
  sellerId?: string;
  vipOnly?: boolean;
  limit?: number;
};

export async function adminListings(filter: ListingFilter = {}) {
  if (!useDatabase) return [];

  const clauses = [];
  if (filter.search?.trim()) {
    const term = `%${filter.search.trim().toLowerCase()}%`;
    clauses.push(
      sql`(lower(${schema.listings.title}) LIKE ${term} OR ${schema.listings.id} LIKE ${term})`,
    );
  }
  if (filter.status) clauses.push(eq(schema.listings.status, filter.status as "active"));
  if (filter.category) clauses.push(eq(schema.listings.category, filter.category));
  if (filter.sellerId) clauses.push(eq(schema.listings.sellerId, filter.sellerId));
  if (filter.vipOnly) clauses.push(eq(schema.listings.vip, true));

  const rows = await db.query.listings.findMany({
    ...(clauses.length ? { where: and(...clauses) } : {}),
    orderBy: desc(schema.listings.publishedAt),
    limit: filter.limit ?? 100,
  });
  if (rows.length === 0) return [];

  const sellers = await db
    .select({ id: schema.users.id, name: schema.users.name })
    .from(schema.users)
    .where(inArray(schema.users.id, [...new Set(rows.map((row) => row.sellerId))]));
  const nameOf = new Map(sellers.map((row) => [row.id, row.name]));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    price: row.price,
    status: row.status,
    category: row.category,
    kind: row.kind,
    vip: row.vip,
    vipUntil: row.vipUntil ? String(row.vipUntil) : null,
    views: row.views,
    contacts: row.contacts,
    publishedAt: row.publishedAt,
    sellerId: row.sellerId,
    sellerName: nameOf.get(row.sellerId) ?? row.sellerId,
  }));
}

export async function listingTotals() {
  if (!useDatabase) return { total: 0, byStatus: {} as Record<string, number> };
  const rows = await db
    .select({ status: schema.listings.status, n: count() })
    .from(schema.listings)
    .groupBy(schema.listings.status);
  return {
    total: rows.reduce((sum, row) => sum + row.n, 0),
    byStatus: Object.fromEntries(rows.map((row) => [row.status, row.n])),
  };
}

/** Accounts a listing can be attributed to, for the create form's picker. */
export async function sellerChoices() {
  if (!useDatabase) return [];
  const rows = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      kind: schema.users.kind,
      status: schema.users.status,
    })
    .from(schema.users)
    .where(eq(schema.users.status, "active"))
    .orderBy(schema.users.name)
    .limit(300);
  return rows;
}

export type AdminListingResult =
  | { ok: true; id: string }
  | { ok: false; reason: string; field?: string };

/**
 * Publishing a listing on somebody's behalf.
 *
 * Reuses `createListing` rather than writing a second insert, so a listing made
 * here passes exactly the validation a seller's own does — the same required
 * attributes, the same price bounds, the same generated slug. Two paths into
 * one table that disagree about what a valid listing is would drift within a
 * month.
 *
 * `status` is the one thing the panel may set that a seller cannot: a listing
 * created by staff can go straight to `active`, because the moderation queue
 * exists to check strangers and this is not one.
 */
export async function createListingAs(
  sellerId: string,
  draft: ListingDraft,
  status: "active" | "moderation" = "active",
): Promise<AdminListingResult> {
  if (!useDatabase) return { ok: false, reason: "unavailable" };
  if (!(await can("manageCatalog"))) return { ok: false, reason: "notAllowed" };

  const seller = await db.query.users.findFirst({
    where: eq(schema.users.id, sellerId),
    columns: { id: true, name: true, status: true },
  });
  if (!seller) return { ok: false, reason: "unknownSeller", field: "sellerId" };
  if (seller.status !== "active") return { ok: false, reason: "sellerBlocked", field: "sellerId" };

  const created = await createListing(draft, sellerId);
  if (!created.ok) {
    return {
      ok: false,
      reason: created.reason,
      ...(created.field ? { field: created.field } : {}),
    };
  }

  if (status === "active") {
    await db
      .update(schema.listings)
      .set({ status: "active" })
      .where(eq(schema.listings.id, created.listing.id));
  }

  const actorId = await currentUserId();
  await recordAction({
    actorId,
    action: "createListingForSeller",
    entityType: "listing",
    entityId: created.listing.id,
    entityLabel: created.listing.title,
    from: "—",
    to: status,
    // Both names, always. This is the record of who actually typed it.
    note: `${seller.name} adına yaradıldı`,
  });

  return { ok: true, id: created.listing.id };
}

export type ListingActionResult =
  | { ok: true }
  | { ok: false; reason: "notAllowed" | "notFound" | "invalid" };

/** Moving a listing between states, or granting VIP by hand. */
export async function updateListingFromPanel(
  listingId: string,
  change: { status?: string; vip?: boolean; vipDays?: number },
): Promise<ListingActionResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };
  if (!(await can("manageCatalog"))) return { ok: false, reason: "notAllowed" };

  const row = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
    columns: { id: true, title: true, status: true, vip: true, vipUntil: true },
  });
  if (!row) return { ok: false, reason: "notFound" };

  const actorId = await currentUserId();

  if (change.status) {
    if (!["active", "moderation", "draft", "sold", "archived"].includes(change.status)) {
      return { ok: false, reason: "invalid" };
    }
    await db
      .update(schema.listings)
      .set({ status: change.status as "active" })
      .where(eq(schema.listings.id, listingId));

    await recordAction({
      actorId,
      action: "setListingStatus",
      entityType: "listing",
      entityId: listingId,
      entityLabel: row.title,
      from: row.status,
      to: change.status,
    });
  }

  if (typeof change.vip === "boolean") {
    // Granted by hand rather than bought. Counted from today, inclusive, the
    // same way a paid order is.
    const days = change.vipDays && change.vipDays > 0 ? Math.min(change.vipDays, 365) : 30;
    let vipUntil: string | null = null;
    if (change.vip) {
      const until = new Date();
      until.setHours(0, 0, 0, 0);
      until.setDate(until.getDate() + days - 1);
      vipUntil = `${until.getFullYear()}-${String(until.getMonth() + 1).padStart(2, "0")}-${String(until.getDate()).padStart(2, "0")}`;
    }

    await db
      .update(schema.listings)
      .set({ vip: change.vip, vipUntil })
      .where(eq(schema.listings.id, listingId));

    await recordAction({
      actorId,
      action: change.vip ? "grantVip" : "revokeVip",
      entityType: "listing",
      entityId: listingId,
      entityLabel: row.title,
      from: row.vip ? String(row.vipUntil ?? "vip") : "adi",
      to: vipUntil ?? "adi",
      note: change.vip ? "Panel vasitəsilə, ödənişsiz" : null,
    });
  }

  return { ok: true };
}
