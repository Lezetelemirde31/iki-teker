import { NextResponse } from "next/server";

import { writeReview } from "@/server/reviews";
import { currentUserId } from "@/server/session";

/**
 * Leaving a review.
 *
 * The request names a booking, never a person. Who is being reviewed is derived
 * from that booking on the server, which is what makes a rating here impossible
 * to aim at someone you have not actually dealt with.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Identity comes from the same place as every other write here. Reviews are
  // not held to a stricter rule than publishing a listing or confirming a
  // booking — when the demo persona goes, it goes for all of them at once, in
  // `currentUser()`.
  const userId = await currentUserId();

  let payload: { bookingId?: unknown; rating?: unknown; text?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { bookingId, rating, text } = payload;
  if (typeof bookingId !== "string" || typeof rating !== "number" || typeof text !== "string") {
    return NextResponse.json({ error: "bookingId, rating and text are required" }, { status: 400 });
  }

  const result = await writeReview(bookingId, userId, rating, text);
  if (result.ok) return NextResponse.json({ review: result.review }, { status: 201 });

  const status =
    result.reason === "notFound" ? 404 : result.reason === "notYours" ? 403 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
