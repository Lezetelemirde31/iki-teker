import { NextResponse } from "next/server";

import { isLocale } from "@/i18n/config";
import { createPart, type PartDraft } from "@/server/parts";
import { currentUserId } from "@/server/session";
import { useDatabase } from "@/server/source";

/**
 * Publishing a spare part or a piece of gear.
 *
 * Separate from /api/listings because the two accept genuinely different
 * bodies: a vehicle is identified by a make, model and year the server can
 * verify against a taxonomy, while a part is identified by a title only its
 * seller knows. Folding both into one endpoint would mean a body where half
 * the fields are meaningless depending on the other half.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Partial<PartDraft>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const required = ["category", "partType", "cityId", "districtId"] as const;
  for (const field of required) {
    if (typeof body[field] !== "string" || !body[field]) {
      return NextResponse.json({ error: "missing", field }, { status: 400 });
    }
  }

  const result = await createPart(
    {
      category: body.category as string,
      partType: body.partType as string,
      brand: typeof body.brand === "string" ? body.brand : "",
      title: typeof body.title === "string" ? body.title : "",
      partNumber: typeof body.partNumber === "string" ? body.partNumber : undefined,
      stock: Number(body.stock),
      price: Number(body.price),
      negotiable: body.negotiable === true,
      condition: body.condition === "new" ? "new" : "used",
      cityId: body.cityId as string,
      districtId: body.districtId as string,
      description: typeof body.description === "string" ? body.description : "",
      delivery: body.delivery === true,
      attributes:
        body.attributes && typeof body.attributes === "object" ? body.attributes : {},
      fitsMakeIds: Array.isArray(body.fitsMakeIds)
        ? body.fitsMakeIds.filter((id): id is string => typeof id === "string")
        : [],
      fitsYearFrom: numberOrUndefined(body.fitsYearFrom),
      fitsYearTo: numberOrUndefined(body.fitsYearTo),
      locale: isLocale(body.locale) ? body.locale : "az",
      // Optional, and only a number to ring — never written to the account.
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

  if (result.ok) {
    return NextResponse.json({ listing: result.part, persisted: useDatabase }, { status: 201 });
  }

  return NextResponse.json({ error: result.reason, field: result.field }, { status: 422 });
}

function numberOrUndefined(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
