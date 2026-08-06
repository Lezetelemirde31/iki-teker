import "server-only";

import { and, avg, count, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { locales, localeMeta, type Locale } from "@/i18n/config";
import type { Review } from "@/types";

import { getCatalogItem } from "./data";
import { notify } from "./notifications";
import { useDatabase } from "./source";

/**
 * Writing a review.
 *
 * A rating is only worth reading if it could not have been bought, and the way
 * this product guarantees that is structural: a review has no route into the
 * database except through a booking that finished. There is no "leave a review"
 * button that takes a target id — the caller names a booking, and who is being
 * reviewed is derived from it.
 *
 * Both directions matter. A renter rates the owner, and the owner rates the
 * renter, because the person handing over a motorcycle is taking the larger
 * risk and needs somewhere to record that it came back clean and on time.
 */

export type ReviewFailure =
  | "notFound"
  | "notYours"
  | "notFinished"
  | "alreadyReviewed"
  | "invalidRating"
  | "tooShort"
  | "tooLong";

export type ReviewResult = { ok: true; review: Review } | { ok: false; reason: ReviewFailure };

const MIN_TEXT = 10;
const MAX_TEXT = 1500;

/**
 * Two people can review one booking — each other — so identity is the pair.
 * Without this the second person to write would look like a duplicate.
 */
async function existingReview(bookingId: string, authorId: string) {
  return db.query.reviews.findFirst({
    where: and(eq(schema.reviews.bookingId, bookingId), eq(schema.reviews.authorId, authorId)),
  });
}

export async function writeReview(
  bookingId: string,
  authorId: string,
  rating: number,
  text: string,
): Promise<ReviewResult> {
  const stars = Math.trunc(rating);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return { ok: false, reason: "invalidRating" };
  }

  const body = text.trim();
  if (body.length < MIN_TEXT) return { ok: false, reason: "tooShort" };
  if (body.length > MAX_TEXT) return { ok: false, reason: "tooLong" };

  if (!useDatabase) return { ok: false, reason: "notFound" };

  const booking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.id, bookingId),
  });
  if (!booking) return { ok: false, reason: "notFound" };

  // Whoever is not the author is the one being reviewed. Deriving it rather
  // than accepting it is what stops a review being aimed at a stranger.
  const targetId =
    authorId === booking.renterId
      ? booking.ownerId
      : authorId === booking.ownerId
        ? booking.renterId
        : null;
  if (!targetId) return { ok: false, reason: "notYours" };

  // The whole guarantee in one line: the rental has to have actually happened.
  if (booking.status !== "returned") return { ok: false, reason: "notFinished" };

  if (await existingReview(bookingId, authorId)) return { ok: false, reason: "alreadyReviewed" };

  const listing = await getCatalogItem(booking.listingId);

  // What the reviewer wrote is stored verbatim in all three locales. The same
  // reasoning as a listing description: translating somebody's words is not
  // something this can invent, and two blank locales would render an empty
  // review.
  const everywhere = (value: string) =>
    Object.fromEntries(locales.map((each) => [each, value])) as Record<Locale, string>;

  // The subject *is* generated, so it is generated properly — "Vespa · iyul
  // 2026" for a reader in Azerbaijani, "июль 2026" for one in Russian.
  const when = new Date(booking.startDate);
  const subject = Object.fromEntries(
    locales.map((each) => [
      each,
      `${listing?.title ?? ""} · ${when.toLocaleDateString(localeMeta[each].dateLocale, { month: "long", year: "numeric" })}`,
    ]),
  ) as Record<Locale, string>;

  const row = {
    id: `rv-${crypto.randomUUID().slice(0, 8)}`,
    authorId,
    targetId,
    rating: stars,
    text: everywhere(body),
    context: "rental" as const,
    subject,
    bookingId,
    // Nothing else can write here, so this is a statement of fact rather than
    // a flag somebody sets.
    verifiedTransaction: true,
    createdAt: new Date(),
  };

  await db.insert(schema.reviews).values(row);
  await refreshRating(targetId);

  void notify(targetId, "reviewReceived", { stars: String(stars), userId: targetId });

  return {
    ok: true,
    review: {
      id: row.id,
      authorId,
      targetId,
      rating: stars,
      text: row.text,
      context: "rental",
      subject: row.subject,
      createdAt: row.createdAt.toISOString(),
      verifiedTransaction: true,
    },
  };
}

/**
 * Recomputes the rating shown on a profile.
 *
 * The average and the count live on the user because every card and search
 * result shows them, and aggregating reviews per row would be a query per
 * result. They are derived, never edited — recomputed from the reviews rather
 * than incremented, so a deleted review cannot leave the number wrong.
 */
export async function refreshRating(userId: string): Promise<void> {
  const [totals] = await db
    .select({ average: avg(schema.reviews.rating), n: count() })
    .from(schema.reviews)
    .where(eq(schema.reviews.targetId, userId));

  await db
    .update(schema.users)
    .set({
      rating: String(Number(totals?.average ?? 0).toFixed(2)),
      reviewsCount: totals?.n ?? 0,
    })
    .where(eq(schema.users.id, userId));
}

/**
 * The bookings this person could still review.
 *
 * Asked for by the account screen so it can offer the prompt exactly where the
 * rental already is, rather than in a notification nobody opens.
 */
export async function reviewableBookings(userId: string): Promise<string[]> {
  if (!useDatabase) return [];

  const finished = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, "returned"),
        // Either side of the transaction may write one.
        or(eq(schema.bookings.renterId, userId), eq(schema.bookings.ownerId, userId)),
      ),
    );

  const ids = finished.map((row) => row.id);
  if (ids.length === 0) return [];

  const written = await db
    .select({ bookingId: schema.reviews.bookingId })
    .from(schema.reviews)
    .where(and(inArray(schema.reviews.bookingId, ids), eq(schema.reviews.authorId, userId)));

  const done = new Set(written.map((row) => row.bookingId));
  return ids.filter((id) => !done.has(id));
}
