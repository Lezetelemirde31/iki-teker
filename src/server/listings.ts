import "server-only";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { locales, type Locale } from "@/i18n/config";
import { cityById, districtById } from "@/mocks/geo";
import { categorySchemas, makeById, makesFor, modelById, modelsFor } from "@/mocks/taxonomy";
import type { ArtTone, AttributeValues, Listing, Photo, VehicleCategorySlug } from "@/types";

import { useDatabase } from "./source";

/**
 * Publishing a vehicle listing.
 *
 * The client sends what the seller typed; everything derived — the title, the
 * slug, the make and model names, the artwork, the stats — is produced here.
 * A listing whose title disagreed with its make and model would be a listing
 * nobody could find.
 *
 * Photo upload is not built yet, so each listing gets the same generated
 * artwork the rest of the catalogue uses: a deterministic silhouette and
 * gradient keyed off the listing id. That keeps every screen rendering
 * correctly instead of leaving holes where images should be, and swapping in
 * real photos later changes only this function.
 */

export type ListingDraft = {
  category: string;
  makeId: string;
  modelId: string;
  year: number;
  price: number;
  negotiable: boolean;
  condition: string;
  cityId: string;
  districtId: string;
  description: string;
  delivery: boolean;
  customsCleared: boolean;
  attributes: AttributeValues;
  /** Language the description was written in, so it is stored as that. */
  locale: Locale;
};

export type ListingFailure =
  | "unknownCategory"
  | "unknownMake"
  | "unknownModel"
  | "modelMismatch"
  | "invalidYear"
  | "invalidPrice"
  | "unknownCity"
  | "districtMismatch"
  | "descriptionTooShort"
  | "missingAttribute";

export type ListingResult =
  | { ok: true; listing: Listing }
  | { ok: false; reason: ListingFailure; field?: string };

const MIN_DESCRIPTION = 20;
const MAX_DESCRIPTION = 4000;
const MAX_PRICE = 1_000_000;
const EARLIEST_YEAR = 1950;

const tones: ArtTone[] = ["sand", "clay", "olive", "sage", "slate", "steel", "dusk", "amber"];

export async function createListing(
  draft: ListingDraft,
  sellerId: string,
): Promise<ListingResult> {
  /* ---- taxonomy -------------------------------------------------------- */
  if (!(draft.category in categorySchemas)) {
    return { ok: false, reason: "unknownCategory", field: "category" };
  }
  const category = draft.category as VehicleCategorySlug;

  const make = makeById.get(draft.makeId);
  if (!make) return { ok: false, reason: "unknownMake", field: "makeId" };
  // A make that does not build scooters cannot be the make of a scooter.
  if (!makesFor(category).some((m) => m.id === make.id)) {
    return { ok: false, reason: "unknownMake", field: "makeId" };
  }

  const model = modelById.get(draft.modelId);
  if (!model) return { ok: false, reason: "unknownModel", field: "modelId" };
  if (!modelsFor(make.id, category).some((m) => m.id === model.id)) {
    return { ok: false, reason: "modelMismatch", field: "modelId" };
  }

  /* ---- year, bounded by the model's own production run ------------------ */
  const [modelFrom, modelTo] = model.years;
  const year = Math.trunc(draft.year);
  if (
    !Number.isFinite(year) ||
    year < Math.max(EARLIEST_YEAR, modelFrom) ||
    year > modelTo + 1 // allowing next model year, as dealers list them early
  ) {
    return { ok: false, reason: "invalidYear", field: "year" };
  }

  /* ---- price ------------------------------------------------------------ */
  const price = Math.trunc(draft.price);
  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
    return { ok: false, reason: "invalidPrice", field: "price" };
  }

  /* ---- location --------------------------------------------------------- */
  const city = cityById.get(draft.cityId);
  if (!city) return { ok: false, reason: "unknownCity", field: "cityId" };
  const district = districtById.get(draft.districtId);
  if (!district || district.cityId !== city.id) {
    return { ok: false, reason: "districtMismatch", field: "districtId" };
  }

  /* ---- description ------------------------------------------------------ */
  const description = draft.description.trim();
  if (description.length < MIN_DESCRIPTION) {
    return { ok: false, reason: "descriptionTooShort", field: "description" };
  }

  /* ---- category attributes ---------------------------------------------- */
  const attributes: AttributeValues = {};
  for (const definition of categorySchemas[category]) {
    const value = draft.attributes[definition.key];
    if (value === undefined || value === "") {
      if (definition.required) {
        return { ok: false, reason: "missingAttribute", field: definition.key };
      }
      continue;
    }
    attributes[definition.key] =
      definition.type === "number" ? Number(value) : definition.type === "boolean" ? Boolean(value) : value;
  }

  /* ---- derived ---------------------------------------------------------- */
  const id = `l-${crypto.randomUUID().slice(0, 8)}`;
  const title = `${make.name} ${model.name}, ${year}`;
  const tone = tones[Math.abs(hash(id)) % tones.length] ?? "slate";

  // The seller writes in one language. Translating it is not something this can
  // invent, so the same text is stored under every locale rather than leaving
  // two of them blank — `localized()` would otherwise fall back to English and
  // show nothing at all.
  const localisedDescription = Object.fromEntries(
    locales.map((locale) => [locale, description.slice(0, MAX_DESCRIPTION)]),
  ) as Record<Locale, string>;

  const listing: Listing = {
    id,
    kind: "vehicle",
    slug: `${slugify(title)}--${id.slice(2)}`,
    title,
    category,
    makeId: make.id,
    modelId: model.id,
    makeName: make.name,
    modelName: model.name,
    year,
    price,
    negotiable: draft.negotiable,
    condition: draft.condition === "new" ? "new" : "used",
    customsCleared: draft.customsCleared,
    delivery: draft.delivery,
    description: localisedDescription,
    photos: generatedPhotos(id, tone, title),
    attributes,
    sellerId,
    cityId: city.id,
    districtId: district.id,
    // Queued for review, not published. There is now a screen that empties the
    // queue, so the alternative — a scam listing reaching buyers before anyone
    // has looked at it — is the worse trade.
    status: "moderation",
    promotion: { vip: false },
    stats: { views: 0, contacts: 0, favorites: 0 },
    publishedAt: new Date().toISOString(),
  };

  if (!useDatabase) return { ok: true, listing };

  await db.insert(schema.listings).values({
    id: listing.id,
    kind: "vehicle",
    slug: listing.slug,
    title: listing.title,
    category: listing.category,
    price: listing.price,
    negotiable: listing.negotiable,
    condition: listing.condition,
    description: listing.description,
    attributes: listing.attributes,
    photos: listing.photos,
    sellerId: listing.sellerId,
    cityId: listing.cityId,
    districtId: listing.districtId,
    delivery: listing.delivery,
    status: listing.status,
    makeId: listing.makeId,
    modelId: listing.modelId,
    year: listing.year,
    customsCleared: listing.customsCleared,
    vip: false,
    views: 0,
    contacts: 0,
    favorites: 0,
    publishedAt: new Date(listing.publishedAt),
  });

  return { ok: true, listing };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Three placeholder frames, the same shape the seeded catalogue uses. */
function generatedPhotos(id: string, tone: ArtTone, alt: string): Photo[] {
  return Array.from({ length: 3 }, (_, index) => ({
    id: `${id}-p${index + 1}`,
    seed: `${id}-${index + 1}`,
    tone,
    alt: `${alt} — ${index + 1}`,
  }));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/ə/g, "e")
    .replace(/[ıİ]/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Stable per id, so a listing keeps the same artwork on every render. */
function hash(value: string) {
  let result = 0;
  for (let i = 0; i < value.length; i++) result = (result * 31 + value.charCodeAt(i)) | 0;
  return result;
}
