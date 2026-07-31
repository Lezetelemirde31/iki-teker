import { NextResponse } from "next/server";

import { getCatalogItem, getOfferForListing } from "@/server/data";
import type { CatalogItem, RentalOffer } from "@/types";

/**
 * Resolves a batch of listing ids.
 *
 * Favourites live in the browser's own storage, so the server has no way to
 * know what to render until the client says. That makes this the one screen
 * that has to ask — and it asks once for the whole set rather than per card.
 *
 * A POST rather than a GET with a long query string: the id list is unbounded,
 * and URLs are not.
 */
export const dynamic = "force-dynamic";

const MAX_IDS = 100;

export async function POST(request: Request) {
  let ids: unknown;
  try {
    ({ ids } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "ids must be an array of strings" }, { status: 400 });
  }

  // Capped so a crafted request cannot turn into an unbounded fan-out.
  const wanted = (ids as string[]).slice(0, MAX_IDS);

  const found = (await Promise.all(wanted.map((id) => getCatalogItem(id)))).filter(
    (item): item is CatalogItem => item !== undefined,
  );

  const offers = await Promise.all(
    found.map((item) =>
      item.kind === "vehicle" ? getOfferForListing(item.id) : Promise.resolve(undefined),
    ),
  );

  const offersById: Record<string, RentalOffer> = {};
  offers.forEach((offer) => {
    if (offer) offersById[offer.listingId] = offer;
  });

  // Returned in the order asked for, so the client keeps its own sorting.
  const byId = new Map(found.map((item) => [item.id, item]));
  return NextResponse.json({
    items: wanted.map((id) => byId.get(id)).filter(Boolean),
    offers: offersById,
  });
}
