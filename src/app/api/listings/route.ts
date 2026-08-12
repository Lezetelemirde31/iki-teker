import { NextResponse } from "next/server";

import { isLocale } from "@/i18n/config";
import { createListing, type ListingDraft } from "@/server/listings";
import { currentUserId } from "@/server/session";
import { useDatabase } from "@/server/source";

/**
 * Publishing a listing.
 *
 * The body is the seller's own words and choices. Titles, slugs, artwork and
 * counters are not accepted from it — they are derived server-side, so a
 * listing cannot claim to be something its make and model are not.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Partial<ListingDraft>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const required = ["category", "makeId", "modelId", "cityId", "districtId"] as const;
  for (const field of required) {
    if (typeof body[field] !== "string" || !body[field]) {
      return NextResponse.json({ error: "missing", field }, { status: 400 });
    }
  }

  const result = await createListing(
    {
      category: body.category as string,
      makeId: body.makeId as string,
      modelId: body.modelId as string,
      year: Number(body.year),
      price: Number(body.price),
      negotiable: body.negotiable === true,
      condition: body.condition === "new" ? "new" : "used",
      cityId: body.cityId as string,
      districtId: body.districtId as string,
      description: typeof body.description === "string" ? body.description : "",
      delivery: body.delivery === true,
      customsCleared: body.customsCleared === true,
      attributes:
        body.attributes && typeof body.attributes === "object" ? body.attributes : {},
      locale: isLocale(body.locale) ? body.locale : "az",
      // Optional, and only a number to ring — it is not written to the account
      // and gives no one a way to sign in.
      ...(typeof body.contactPhone === "string" && body.contactPhone.trim()
        ? { contactPhone: body.contactPhone }
        : {}),
      // Checked server-side against this seller and against storage, so an
      // arbitrary list here buys nothing.
      photoKeys: Array.isArray(body.photoKeys)
        ? body.photoKeys.filter((key: unknown): key is string => typeof key === "string")
        : undefined,
    },
    await currentUserId(),
  );

  // Without a database the listing is built and returned but not stored, so
  // sending the seller to its page would land them on a 404. The client needs
  // to know which happened.
  if (result.ok) {
    return NextResponse.json(
      { listing: result.listing, persisted: useDatabase },
      { status: 201 },
    );
  }

  // Everything the seller can fix by changing the form.
  return NextResponse.json({ error: result.reason, field: result.field }, { status: 422 });
}
