import { NextResponse } from "next/server";

import { conflictReasons, requestBooking, type BookingRequest } from "@/server/bookings";
import { currentUserId } from "@/server/session";

/**
 * Requesting a rental.
 *
 * The body carries the listing and the dates. It does not carry a price — that
 * is recomputed from the offer, because anything a browser sends about money is
 * a suggestion, not a fact.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Partial<BookingRequest>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { listingId, start, end } = body;
  if (typeof listingId !== "string" || typeof start !== "string" || typeof end !== "string") {
    return NextResponse.json({ error: "listingId, start and end are required" }, { status: 400 });
  }

  const result = await requestBooking(
    {
      listingId,
      start,
      end,
      licenceUploaded: body.licenceUploaded === true,
      agreementAccepted: body.agreementAccepted === true,
    },
    await currentUserId(),
  );

  if (result.ok) return NextResponse.json({ booking: result.booking }, { status: 201 });

  // 409 for "someone else has these dates", 404 for a listing that is not
  // there, 422 for everything the caller can fix by changing the request.
  const status = conflictReasons.has(result.reason)
    ? 409
    : result.reason === "notFound"
      ? 404
      : 422;

  return NextResponse.json({ error: result.reason }, { status });
}
