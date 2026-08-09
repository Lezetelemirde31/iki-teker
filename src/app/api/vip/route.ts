import { NextResponse } from "next/server";

import { orderVip } from "@/server/promotions";
import { currentUserId } from "@/server/session";

/**
 * A seller ordering VIP placement for one of their own listings.
 *
 * Grants nothing. It records the intention and returns a reference to quote on
 * the transfer — the listing does not move until somebody who can see the bank
 * account says the money arrived. Which listing is whose is read from the row,
 * never taken from the request.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sellerId = await currentUserId();

  let payload: { listingId?: unknown; days?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { listingId, days } = payload;
  if (typeof listingId !== "string" || typeof days !== "number") {
    return NextResponse.json({ error: "listingId and days are required" }, { status: 400 });
  }

  const result = await orderVip(listingId, days, sellerId);
  if (result.ok) return NextResponse.json({ order: result.order }, { status: 201 });

  const status =
    result.reason === "notFound"
      ? 404
      : result.reason === "notYours"
        ? 403
        : result.reason === "alreadyPending"
          ? 409
          : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
