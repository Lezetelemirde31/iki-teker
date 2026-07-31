import "server-only";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { locales, type Locale } from "@/i18n/config";
import { cityById, districtById } from "@/mocks/geo";
import { categorySchemas, makeById } from "@/mocks/taxonomy";
import type {
  ArtTone,
  AttributeValues,
  Compatibility,
  GearType,
  Part,
  PartType,
  Photo,
} from "@/types";

import { useDatabase } from "./source";

/**
 * Publishing a spare part or a piece of gear.
 *
 * Kept apart from `createListing` because the two are only superficially
 * similar. A vehicle's title is derived — Honda + CB650R + 2021 — and cannot be
 * anything else. A part's title cannot be derived from anything: "Brembo SA
 * brake pads, front" is a fact about the object that only the seller knows. So
 * here the seller writes the title and the server validates it, which is the
 * opposite of the rule for vehicles.
 *
 * Fitment is the other difference. A part that fits nothing is unfindable, but
 * a part that fits everything is real — chain lube, a universal phone mount —
 * so compatibility is optional. An entry naming a make with no models means
 * "every model of that make", which is what the domain type already says.
 */

export type PartDraft = {
  category: string;
  partType: string;
  brand: string;
  title: string;
  partNumber?: string;
  stock: number;
  price: number;
  negotiable: boolean;
  condition: string;
  cityId: string;
  districtId: string;
  description: string;
  delivery: boolean;
  attributes: AttributeValues;
  /** Make ids the part fits. Empty means it is not fitment-specific. */
  fitsMakeIds: string[];
  fitsYearFrom?: number;
  fitsYearTo?: number;
  locale: Locale;
};

export type PartFailure =
  | "unknownCategory"
  | "unknownPartType"
  | "brandTooShort"
  | "titleTooShort"
  | "invalidPrice"
  | "invalidStock"
  | "unknownCity"
  | "districtMismatch"
  | "descriptionTooShort"
  | "missingAttribute"
  | "unknownMake"
  | "invalidYearRange";

export type PartResult =
  | { ok: true; part: Part }
  | { ok: false; reason: PartFailure; field?: string };

const partTypes: PartType[] = [
  "engine",
  "brakes",
  "tires",
  "transmission",
  "filters",
  "electrical",
  "body",
  "battery",
  "suspension",
];

const gearTypes: GearType[] = ["helmet", "jacket", "gloves", "boots", "protection", "luggage"];

const MIN_TITLE = 6;
const MIN_BRAND = 2;
const MIN_DESCRIPTION = 20;
const MAX_DESCRIPTION = 4000;
const MAX_PRICE = 100_000;
const MAX_STOCK = 9999;
const EARLIEST_FITMENT_YEAR = 1950;
const LATEST_FITMENT_YEAR = 2030;

const tones: ArtTone[] = ["sand", "clay", "olive", "sage", "slate", "steel", "dusk", "amber"];

export async function createPart(draft: PartDraft, sellerId: string): Promise<PartResult> {
  /* ---- category and type ------------------------------------------------ */
  if (draft.category !== "parts" && draft.category !== "gear") {
    return { ok: false, reason: "unknownCategory", field: "category" };
  }
  const category = draft.category;

  // A helmet is not a brake type. The two lists do not overlap, so the
  // category decides which one applies.
  const allowed: string[] = category === "parts" ? partTypes : gearTypes;
  if (!allowed.includes(draft.partType)) {
    return { ok: false, reason: "unknownPartType", field: "partType" };
  }

  /* ---- what the seller wrote -------------------------------------------- */
  const brand = draft.brand.trim();
  if (brand.length < MIN_BRAND) return { ok: false, reason: "brandTooShort", field: "brand" };

  const title = draft.title.trim();
  if (title.length < MIN_TITLE) return { ok: false, reason: "titleTooShort", field: "title" };

  const description = draft.description.trim();
  if (description.length < MIN_DESCRIPTION) {
    return { ok: false, reason: "descriptionTooShort", field: "description" };
  }

  /* ---- numbers ---------------------------------------------------------- */
  const price = Math.trunc(draft.price);
  if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
    return { ok: false, reason: "invalidPrice", field: "price" };
  }

  const stock = Math.trunc(draft.stock);
  if (!Number.isFinite(stock) || stock < 1 || stock > MAX_STOCK) {
    return { ok: false, reason: "invalidStock", field: "stock" };
  }

  /* ---- location --------------------------------------------------------- */
  const city = cityById.get(draft.cityId);
  if (!city) return { ok: false, reason: "unknownCity", field: "cityId" };
  const district = districtById.get(draft.districtId);
  if (!district || district.cityId !== city.id) {
    return { ok: false, reason: "districtMismatch", field: "districtId" };
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
      definition.type === "number"
        ? Number(value)
        : definition.type === "boolean"
          ? Boolean(value)
          : value;
  }

  /* ---- fitment ---------------------------------------------------------- */
  const compatibility = buildCompatibility(draft);
  if (compatibility === "unknownMake") {
    return { ok: false, reason: "unknownMake", field: "fitsMakeIds" };
  }
  if (compatibility === "invalidYearRange") {
    return { ok: false, reason: "invalidYearRange", field: "fitsYearFrom" };
  }

  /* ---- derived ---------------------------------------------------------- */
  const id = `p-${crypto.randomUUID().slice(0, 8)}`;
  const tone = tones[Math.abs(hash(id)) % tones.length] ?? "slate";

  // One language in, three out — the same reasoning as a vehicle's
  // description. Translation is not something this can invent, and leaving two
  // locales blank would render an empty title.
  const localised = (text: string) =>
    Object.fromEntries(locales.map((locale) => [locale, text])) as Record<Locale, string>;

  const part: Part = {
    id,
    kind: "part",
    slug: `${slugify(title)}--${id.slice(2)}`,
    title,
    localizedTitle: localised(title),
    category,
    partType: draft.partType as PartType | GearType,
    brand,
    partNumber: draft.partNumber?.trim() || undefined,
    stock,
    compatibility,
    price,
    negotiable: draft.negotiable,
    condition: draft.condition === "new" ? "new" : "used",
    delivery: draft.delivery,
    description: localised(description.slice(0, MAX_DESCRIPTION)),
    photos: generatedPhotos(id, tone, title),
    attributes,
    sellerId,
    cityId: city.id,
    districtId: district.id,
    status: "active",
    promotion: { vip: false },
    stats: { views: 0, contacts: 0, favorites: 0 },
    publishedAt: new Date().toISOString(),
  };

  if (!useDatabase) return { ok: true, part };

  await db.insert(schema.listings).values({
    id: part.id,
    kind: "part",
    slug: part.slug,
    title: part.title,
    localizedTitle: part.localizedTitle,
    category: part.category,
    partType: part.partType,
    brand: part.brand,
    partNumber: part.partNumber ?? null,
    stock: part.stock,
    compatibility: part.compatibility,
    price: part.price,
    negotiable: part.negotiable,
    condition: part.condition,
    description: part.description,
    attributes: part.attributes,
    photos: part.photos,
    sellerId: part.sellerId,
    cityId: part.cityId,
    districtId: part.districtId,
    delivery: part.delivery,
    status: part.status,
    vip: false,
    views: 0,
    contacts: 0,
    favorites: 0,
    publishedAt: new Date(part.publishedAt),
  });

  return { ok: true, part };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Turns the form's flat selection into fitment entries.
 *
 * The form offers makes and one year window rather than a per-make matrix.
 * That covers what sellers actually list — a set of pads fits several makes
 * over the same generation — without a screen nobody would finish filling in.
 * Naming a make with no models means every model of it, which is what the
 * domain type documents.
 */
function buildCompatibility(
  draft: PartDraft,
): Compatibility[] | "unknownMake" | "invalidYearRange" {
  const from = draft.fitsYearFrom;
  const to = draft.fitsYearTo;

  if (from !== undefined || to !== undefined) {
    const bounded = (year?: number) =>
      year === undefined ||
      (Number.isFinite(year) && year >= EARLIEST_FITMENT_YEAR && year <= LATEST_FITMENT_YEAR);
    if (!bounded(from) || !bounded(to)) return "invalidYearRange";
    if (from !== undefined && to !== undefined && from > to) return "invalidYearRange";
  }

  const entries: Compatibility[] = [];
  for (const makeId of draft.fitsMakeIds) {
    const make = makeById.get(makeId);
    if (!make) return "unknownMake";
    entries.push({
      makeId: make.id,
      makeName: make.name,
      modelIds: [],
      modelNames: [],
      yearFrom: from,
      yearTo: to,
    });
  }

  return entries;
}

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

function hash(value: string) {
  let result = 0;
  for (let i = 0; i < value.length; i++) result = (result * 31 + value.charCodeAt(i)) | 0;
  return result;
}
