import "server-only";

import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { canModerate } from "./authorization";
import { recordAction } from "./audit";
import { notify } from "./notifications";
import { currentUserId } from "./session";
import { useDatabase } from "./source";

/**
 * Selling VIP placement.
 *
 * There is no card gateway and the PRD says there will not be one at launch —
 * an acquirer needs a registered legal entity and a bank agreement. So the
 * money moves the way it actually can: the seller transfers, quoting a
 * reference, and somebody who can see the account marks the order paid. That
 * confirmation is the only thing which grants VIP.
 *
 * Which means nothing here charges anybody. Placing an order grants nothing and
 * changes nothing about the listing; it records an intention and produces a
 * reference to quote. Until an administrator has seen the money, the listing
 * sits exactly where it was.
 */

/**
 * What is on sale.
 *
 * A constant rather than a table. Prices change a few times a year, by one
 * person, and a table would mean an editing screen, an audit trail for price
 * changes and a migration — for three numbers that live better in a diff. The
 * price is copied onto the order at purchase, so changing this never rewrites
 * what somebody already paid.
 */
export const VIP_PACKAGES = [
  { days: 7, amount: 12 },
  { days: 14, amount: 20 },
  { days: 30, amount: 35 },
] as const;

export type VipPackage = (typeof VIP_PACKAGES)[number];

/** Where to send the money. Absent until somebody configures it. */
export function bankDetails(): string | undefined {
  return process.env.VIP_BANK_DETAILS?.trim() || undefined;
}

/**
 * A calendar date as the person reading it sees it.
 *
 * Not `toISOString().slice(0, 10)`. That converts local midnight to UTC first,
 * and Baku is four hours ahead — so a week bought on the ninth ended on the
 * fifteenth instead of the sixteenth, and every seller quietly received a day
 * less than they paid for.
 */
function localDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type OrderFailure =
  | "notFound"
  | "notYours"
  | "notActive"
  | "unknownPackage"
  | "alreadyPending"
  | "unavailable";

export type OrderResult =
  | { ok: true; order: { id: string; reference: string; days: number; amount: number } }
  | { ok: false; reason: OrderFailure };

/**
 * A seller asks to promote one of their own listings.
 *
 * Nothing is granted. The listing does not move, no flag is set, and the seller
 * is handed a reference to quote on the transfer — that is the whole of it.
 *
 * The listing has to be active: promoting something still in moderation would
 * sell a place in a catalogue it has not been let into, and promoting a sold
 * one sells nothing at all.
 */
export async function orderVip(
  listingId: string,
  days: number,
  sellerId: string,
): Promise<OrderResult> {
  if (!useDatabase) return { ok: false, reason: "unavailable" };

  const chosen = VIP_PACKAGES.find((option) => option.days === days);
  if (!chosen) return { ok: false, reason: "unknownPackage" };

  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, listingId),
    columns: { id: true, title: true, sellerId: true, status: true },
  });
  if (!listing) return { ok: false, reason: "notFound" };
  // Derived from the row, never taken from the request.
  if (listing.sellerId !== sellerId) return { ok: false, reason: "notYours" };
  if (listing.status !== "active") return { ok: false, reason: "notActive" };

  // One open order per listing. A second would produce a second reference for
  // the same thing, and whichever transfer arrived would be ambiguous.
  const open = await db.query.vipOrders.findFirst({
    where: and(
      eq(schema.vipOrders.listingId, listingId),
      eq(schema.vipOrders.status, "pending"),
    ),
    columns: { id: true },
  });
  if (open) return { ok: false, reason: "alreadyPending" };

  const order = {
    id: `vo-${crypto.randomUUID().slice(0, 8)}`,
    reference: `VIP-${Math.floor(100000 + Math.random() * 899999)}`,
    listingId,
    sellerId,
    days: chosen.days,
    // Frozen here. A six-month-old order has to keep saying what was paid.
    amount: chosen.amount,
    status: "pending" as const,
  };

  await db.insert(schema.vipOrders).values(order);

  return {
    ok: true,
    order: {
      id: order.id,
      reference: order.reference,
      days: order.days,
      amount: order.amount,
    },
  };
}

/** The seller's own orders, so they can see what is still waiting. */
export async function myVipOrders(sellerId: string) {
  if (!useDatabase) return [];
  return db.query.vipOrders.findMany({
    where: eq(schema.vipOrders.sellerId, sellerId),
    orderBy: desc(schema.vipOrders.createdAt),
    limit: 20,
  });
}

/** Everything waiting on somebody who can see the bank account. */
export async function vipOrderQueue() {
  if (!useDatabase) return [];

  const rows = await db.query.vipOrders.findMany({
    orderBy: [schema.vipOrders.status, desc(schema.vipOrders.createdAt)],
    limit: 200,
  });
  if (rows.length === 0) return [];

  const [listings, sellers] = await Promise.all([
    db
      .select({ id: schema.listings.id, title: schema.listings.title })
      .from(schema.listings)
      .where(inArray(schema.listings.id, [...new Set(rows.map((row) => row.listingId))])),
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(inArray(schema.users.id, [...new Set(rows.map((row) => row.sellerId))])),
  ]);

  const titleOf = new Map(listings.map((row) => [row.id, row.title]));
  const nameOf = new Map(sellers.map((row) => [row.id, row.name]));

  return rows.map((row) => ({
    ...row,
    listingTitle: titleOf.get(row.listingId) ?? row.listingId,
    sellerName: nameOf.get(row.sellerId) ?? row.sellerId,
  }));
}

export type DecisionResult =
  | { ok: true; vipUntil?: string }
  | { ok: false; reason: "notAllowed" | "notFound" | "alreadyDecided" };

/**
 * Somebody who can see the account confirms the transfer arrived.
 *
 * This is the only thing that grants VIP, and it is the moment the listing
 * rises. The end date is counted from today rather than from the order, so a
 * seller who transferred slowly is not charged for the days they spent waiting
 * — and one who already has VIP is extended rather than restarted, because
 * buying a second week should add a week.
 */
export async function confirmVipOrder(orderId: string, note?: string): Promise<DecisionResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };
  if (!(await canModerate())) return { ok: false, reason: "notAllowed" };

  const order = await db.query.vipOrders.findFirst({
    where: eq(schema.vipOrders.id, orderId),
  });
  if (!order) return { ok: false, reason: "notFound" };
  if (order.status !== "pending") return { ok: false, reason: "alreadyDecided" };

  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, order.listingId),
    columns: { id: true, title: true, vip: true, vipUntil: true },
  });
  if (!listing) return { ok: false, reason: "notFound" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Counted from the last day already covered, so the days bought are always
  // days added. For a listing with no VIP that is yesterday, which makes today
  // the first of them; for one still running it is the current end date, whose
  // own day is already paid for.
  //
  // `vipUntil` is inclusive — the predicate keeps a listing VIP while the date
  // has not passed — so a week bought today runs through the sixth day after.
  const current = listing.vipUntil ? new Date(`${String(listing.vipUntil)}T00:00:00`) : null;
  const lastCovered = new Date(today);
  if (current && current > today) lastCovered.setTime(current.getTime());
  else lastCovered.setDate(lastCovered.getDate() - 1);

  const until = new Date(lastCovered);
  until.setDate(until.getDate() + order.days);
  const vipUntil = localDate(until);

  const actorId = await currentUserId();

  await db
    .update(schema.listings)
    .set({ vip: true, vipUntil })
    .where(eq(schema.listings.id, order.listingId));

  await db
    .update(schema.vipOrders)
    .set({
      status: "paid",
      decidedById: actorId,
      decidedAt: new Date(),
      note: note?.trim().slice(0, 500) || null,
    })
    .where(and(eq(schema.vipOrders.id, orderId), eq(schema.vipOrders.status, "pending")));

  await recordAction({
    actorId,
    action: "confirmVipPayment",
    entityType: "listing",
    entityId: order.listingId,
    entityLabel: listing.title,
    from: listing.vip ? String(listing.vipUntil ?? "vip") : "adi",
    to: vipUntil,
    note: `${order.reference} · ${order.days} gün · ${order.amount} ₼`,
  });

  void notify(order.sellerId, "vipConfirmed", { title: listing.title, until: vipUntil });

  return { ok: true, vipUntil };
}

/** No money arrived, or the wrong amount did. The listing is untouched. */
export async function rejectVipOrder(orderId: string, note?: string): Promise<DecisionResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };
  if (!(await canModerate())) return { ok: false, reason: "notAllowed" };

  const order = await db.query.vipOrders.findFirst({ where: eq(schema.vipOrders.id, orderId) });
  if (!order) return { ok: false, reason: "notFound" };
  if (order.status !== "pending") return { ok: false, reason: "alreadyDecided" };

  const listing = await db.query.listings.findFirst({
    where: eq(schema.listings.id, order.listingId),
    columns: { title: true },
  });

  const actorId = await currentUserId();

  await db
    .update(schema.vipOrders)
    .set({
      status: "rejected",
      decidedById: actorId,
      decidedAt: new Date(),
      note: note?.trim().slice(0, 500) || null,
    })
    .where(and(eq(schema.vipOrders.id, orderId), eq(schema.vipOrders.status, "pending")));

  await recordAction({
    actorId,
    action: "rejectVipPayment",
    entityType: "listing",
    entityId: order.listingId,
    entityLabel: listing?.title ?? order.listingId,
    from: "pending",
    to: "rejected",
    note: `${order.reference} · ${order.amount} ₼`,
  });

  return { ok: true };
}

/** How many transfers are waiting to be checked — the panel's badge. */
export async function pendingVipCount(): Promise<number> {
  if (!useDatabase) return 0;
  const rows = await db.query.vipOrders.findMany({
    where: eq(schema.vipOrders.status, "pending"),
    columns: { id: true },
  });
  return rows.length;
}
