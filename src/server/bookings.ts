import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { datesBetween, daysBetween, demoISODate } from "@/lib/demo-clock";
import type { Booking } from "@/types";

import { getListing, getOfferForListing, getUser, isRangeAvailable, quote } from "./data";
import { revealContactForBooking } from "./messaging";
import { notify } from "./notifications";
import { useDatabase } from "./source";

/**
 * Creating and confirming a rental booking.
 *
 * Everything the money depends on is recomputed here from the offer: the client
 * sends dates and nothing else that matters. A price posted from the browser is
 * a price someone can edit.
 *
 * Two moments, deliberately separated, because the product treats a request as
 * a request rather than a hold:
 *
 *   request  — creates a `pending` booking. Several renters may hold pending
 *              requests for the same dates; the owner picks one.
 *   confirm  — flips it to `confirmed`, and *that* is where the database's
 *              exclusion constraint arbitrates. Two confirmations for
 *              overlapping dates cannot both succeed, whatever the timing.
 *
 * Putting the guarantee at confirmation rather than at request is what the
 * source design describes, and it is also the only place a hard lock is honest:
 * refusing a second request would promise the first renter a vehicle the owner
 * has not agreed to hand over.
 */

export type BookingRequest = {
  listingId: string;
  start: string;
  end: string;
  licenceUploaded: boolean;
  agreementAccepted: boolean;
};

export type BookingFailure =
  | "notFound"
  | "invalidRange"
  | "pastDate"
  | "belowMinimum"
  | "aboveMaximum"
  | "unavailable"
  | "licenceRequired"
  | "agreementRequired"
  | "ownVehicle"
  | "notOwner"
  | "alreadyDecided";

export type BookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; reason: BookingFailure };

/** Failures the caller caused, versus a conflict that is nobody's fault. */
export const conflictReasons: ReadonlySet<BookingFailure> = new Set(["unavailable"]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* -------------------------------------------------------------------------- */
/*  Create                                                                     */
/* -------------------------------------------------------------------------- */

export async function requestBooking(
  input: BookingRequest,
  renterId: string,
): Promise<BookingResult> {
  const listing = await getListing(input.listingId);
  const offer = listing ? await getOfferForListing(listing.id) : undefined;
  if (!listing || !offer) return { ok: false, reason: "notFound" };

  // An owner renting from themselves would corrupt both sides of the ledger.
  if (offer.ownerId === renterId) return { ok: false, reason: "ownVehicle" };

  if (!ISO_DATE.test(input.start) || !ISO_DATE.test(input.end)) {
    return { ok: false, reason: "invalidRange" };
  }
  if (input.end < input.start) return { ok: false, reason: "invalidRange" };
  if (input.start < demoISODate(0)) return { ok: false, reason: "pastDate" };

  const days = daysBetween(input.start, input.end);
  if (days < offer.minDays) return { ok: false, reason: "belowMinimum" };
  if (days > offer.maxDays) return { ok: false, reason: "aboveMaximum" };

  if (offer.licenceRequired !== "none" && !input.licenceUploaded) {
    return { ok: false, reason: "licenceRequired" };
  }
  if (!input.agreementAccepted) return { ok: false, reason: "agreementRequired" };

  // Owner blackouts and dates already held by a confirmed booking.
  if (!isRangeAvailable(offer, input.start, input.end)) {
    return { ok: false, reason: "unavailable" };
  }

  const priced = quote(offer, input.start, input.end);
  const booking: Booking = {
    id: `bk-${crypto.randomUUID().slice(0, 8)}`,
    code: bookingCode(),
    offerId: offer.id,
    listingId: listing.id,
    renterId,
    ownerId: offer.ownerId,
    start: input.start,
    end: input.end,
    days: priced.days,
    dayPrice: priced.dayPrice,
    subtotal: priced.subtotal,
    serviceFee: priced.serviceFee,
    deposit: priced.deposit,
    total: priced.total,
    commission: priced.commission,
    status: "pending",
    paymentMethod: "cashOnPickup",
    licenceStatus: offer.licenceRequired === "none" ? "verified" : "pending",
    agreementSigned: false,
    steps: [],
    createdAt: new Date().toISOString(),
    respondsInMinutes: 15,
  };

  // Without a database there is nowhere to put it. The demo deployment runs on
  // mocks, so the booking is returned and rendered but not stored — the
  // confirmation screen is honest about what it shows, and no other screen
  // claims the booking exists.
  if (!useDatabase) return { ok: true, booking };

  await db.insert(schema.bookings).values({
    id: booking.id,
    code: booking.code,
    offerId: booking.offerId,
    listingId: booking.listingId,
    renterId: booking.renterId,
    ownerId: booking.ownerId,
    startDate: booking.start,
    endDate: booking.end,
    days: booking.days,
    dayPrice: booking.dayPrice,
    subtotal: booking.subtotal,
    serviceFee: booking.serviceFee,
    deposit: booking.deposit,
    total: booking.total,
    commission: String(booking.commission),
    status: "pending",
    paymentMethod: "cashOnPickup",
    licenceStatus: booking.licenceStatus,
    agreementSigned: false,
    createdAt: new Date(booking.createdAt),
  });

  // The owner is not sitting on the account screen waiting. Not awaited: the
  // booking is made either way, and a push service having a bad minute must not
  // turn a successful request into a failed one.
  const renter = await getUser(renterId);
  void notify(offer.ownerId, "bookingRequested", {
    renter: renter?.name ?? "",
    vehicle: listing.title,
    days: String(priced.days),
  });

  return { ok: true, booking };
}

/* -------------------------------------------------------------------------- */
/*  Confirm                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The owner accepts a pending request.
 *
 * The overlap constraint covers confirmed and active bookings, so this is the
 * statement it guards. A rejection here is not a bug — it means someone else
 * was confirmed for those dates first, and the database said so rather than
 * letting both through.
 */
export async function confirmBooking(bookingId: string, ownerId: string): Promise<BookingResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };

  const row = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) });
  if (!row) return { ok: false, reason: "notFound" };
  if (row.ownerId !== ownerId) return { ok: false, reason: "notOwner" };
  if (row.status !== "pending") return { ok: false, reason: "alreadyDecided" };

  try {
    await db
      .update(schema.bookings)
      .set({ status: "confirmed" })
      .where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.status, "pending")));
  } catch (error) {
    if (isOverlapViolation(error)) return { ok: false, reason: "unavailable" };
    throw error;
  }

  const updated = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) });
  if (!updated) return { ok: false, reason: "notFound" };

  // A confirmed booking is the transaction the contact rule was waiting for.
  await revealContactForBooking(updated.listingId, updated.renterId, updated.id);

  const listing = await getListing(updated.listingId);
  void notify(updated.renterId, "bookingConfirmed", {
    vehicle: listing?.title ?? "",
    code: updated.code,
  });

  return { ok: true, booking: toBooking(updated) };
}

/**
 * The owner turns a request down.
 *
 * Kept separate from cancelling: a decline is the owner's decision on a request
 * that was never accepted, and it frees the dates immediately because they were
 * never held in the first place.
 */
export async function declineBooking(bookingId: string, ownerId: string): Promise<BookingResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };

  const row = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) });
  if (!row) return { ok: false, reason: "notFound" };
  if (row.ownerId !== ownerId) return { ok: false, reason: "notOwner" };
  if (row.status !== "pending") return { ok: false, reason: "alreadyDecided" };

  await db
    .update(schema.bookings)
    .set({ status: "cancelled" })
    .where(and(eq(schema.bookings.id, bookingId), eq(schema.bookings.status, "pending")));

  const updated = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) });
  if (!updated) return { ok: false, reason: "notFound" };

  const declined = await getListing(updated.listingId);
  void notify(updated.renterId, "bookingDeclined", { vehicle: declined?.title ?? "" });

  return { ok: true, booking: toBooking(updated) };
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Requests waiting on the owner, oldest first.
 *
 * Oldest first because the queue is a to-do list: the request that has been
 * waiting longest is the one costing the owner a renter.
 */
export async function pendingRequestsFor(ownerId: string): Promise<Booking[]> {
  if (!useDatabase) return [];
  const rows = await db.query.bookings.findMany({
    where: and(eq(schema.bookings.ownerId, ownerId), eq(schema.bookings.status, "pending")),
    orderBy: schema.bookings.createdAt,
  });
  return rows.map(toBooking);
}

/** A booking by its short code — how the confirmation screen finds its own. */
export async function getBookingByCode(code: string): Promise<Booking | undefined> {
  if (!useDatabase) return undefined;
  const row = await db.query.bookings.findFirst({ where: eq(schema.bookings.code, code) });
  return row ? toBooking(row) : undefined;
}

function toBooking(row: typeof schema.bookings.$inferSelect): Booking {
  return {
    id: row.id,
    code: row.code,
    offerId: row.offerId,
    listingId: row.listingId,
    renterId: row.renterId,
    ownerId: row.ownerId,
    start: String(row.startDate),
    end: String(row.endDate),
    days: row.days,
    dayPrice: row.dayPrice,
    subtotal: row.subtotal,
    serviceFee: row.serviceFee,
    deposit: row.deposit,
    total: row.total,
    commission: Number(row.commission),
    status: row.status,
    paymentMethod: row.paymentMethod,
    licenceStatus: row.licenceStatus,
    agreementSigned: row.agreementSigned,
    steps: [],
    createdAt: row.createdAt.toISOString(),
    respondsInMinutes: 15,
  };
}

/**
 * Dates a pending request would compete for — the owner's queue shows these so
 * they can see two people asking for the same week before choosing.
 */
export async function competingRequests(bookingId: string): Promise<string[]> {
  if (!useDatabase) return [];
  const row = await db.query.bookings.findFirst({ where: eq(schema.bookings.id, bookingId) });
  if (!row) return [];

  const wanted = new Set(datesBetween(String(row.startDate), String(row.endDate)));
  const siblings = await db.query.bookings.findMany({
    where: and(
      eq(schema.bookings.offerId, row.offerId),
      inArray(schema.bookings.status, ["pending"]),
    ),
  });

  return siblings
    .filter(
      (other) =>
        other.id !== row.id &&
        datesBetween(String(other.startDate), String(other.endDate)).some((day) => wanted.has(day)),
    )
    .map((other) => other.code);
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Short reference the renter and owner quote at each other — "IT-2481". */
function bookingCode() {
  return `IT-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Postgres reports an exclusion-constraint breach as 23P01. Drizzle wraps
 * driver errors, so the code can sit a few levels down on `cause`.
 */
function isOverlapViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const err = current as { code?: string; message?: string; cause?: unknown };
    if (err.code === "23P01") return true;
    if (err.message && /bookings_no_overlap|exclusion constraint/i.test(err.message)) return true;
    current = err.cause;
  }
  return false;
}
