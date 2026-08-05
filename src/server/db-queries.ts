import "server-only";

import { and, count, desc, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { demoISODate } from "@/lib/demo-clock";
import { makeById, modelById } from "@/mocks/taxonomy";
import type {
  Booking,
  CatalogItem,
  ChatThread,
  Listing,
  Paginated,
  RentalOffer,
  SearchQuery,
  User,
} from "@/types";

import {
  mapCatalogItem,
  mapMessage,
  mapOffer,
  mapReview,
  mapThread,
  mapUser,
  toISODate,
} from "./mappers";

/**
 * Database-backed reads.
 *
 * Reference data — cities, districts, makes, models, categories, attribute
 * schemas — is deliberately not queried. It is static, tiny, and seeded from
 * the same source the app already imports, so reading it in-process avoids a
 * join on every card for a label that never changes.
 */

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/** Fills the make and model names the row only stores as ids. */
export function withNames(item: CatalogItem): CatalogItem {
  if (item.kind !== "vehicle") return item;
  return {
    ...item,
    makeName: makeById.get(item.makeId)?.name ?? "",
    modelName: modelById.get(item.modelId)?.name ?? "",
  };
}

/** How many active listings a seller has — shown on their profile and cards. */
async function listingCountFor(sellerId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(schema.listings)
    .where(and(eq(schema.listings.sellerId, sellerId), eq(schema.listings.status, "active")));
  return row?.n ?? 0;
}

/**
 * A rental offer's blocked days come from two places: dates the owner blacked
 * out by hand, and dates a live booking is holding. The calendar has to show
 * both, so they are merged on read rather than duplicated on write.
 */
async function blockedDaysFor(offerIds: string[]) {
  if (offerIds.length === 0) return new Map<string, string[]>();

  const [blackouts, booked] = await Promise.all([
    db
      .select()
      .from(schema.rentalBlackouts)
      .where(inArray(schema.rentalBlackouts.offerId, offerIds)),
    db
      .select({
        offerId: schema.bookings.offerId,
        start: schema.bookings.startDate,
        end: schema.bookings.endDate,
      })
      .from(schema.bookings)
      .where(
        and(
          inArray(schema.bookings.offerId, offerIds),
          inArray(schema.bookings.status, ["confirmed", "active"]),
        ),
      ),
  ]);

  const map = new Map<string, Set<string>>();
  const add = (offerId: string, day: string) => {
    const set = map.get(offerId) ?? new Set<string>();
    set.add(day);
    map.set(offerId, set);
  };

  for (const row of blackouts) add(row.offerId, toISODate(row.day));

  for (const row of booked) {
    const cursor = new Date(`${toISODate(row.start)}T00:00:00Z`);
    const last = new Date(`${toISODate(row.end)}T00:00:00Z`);
    while (cursor <= last) {
      add(row.offerId, cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  return new Map([...map].map(([id, days]) => [id, [...days].sort()]));
}

/** First day from today with nothing blocking it — drives the "TODAY" badge. */
function firstFreeDay(blocked: string[]): string {
  const taken = new Set(blocked);
  for (let offset = 0; offset < 90; offset++) {
    const day = demoISODate(offset);
    if (!taken.has(day)) return day;
  }
  return demoISODate(0);
}

async function loadOffers(rows: (typeof schema.rentalOffers.$inferSelect)[]) {
  if (rows.length === 0) return [];

  const [blocked, owners] = await Promise.all([
    blockedDaysFor(rows.map((row) => row.id)),
    db
      .select({
        id: schema.users.id,
        rating: schema.users.rating,
        rentalsCount: schema.users.rentalsCount,
      })
      .from(schema.users)
      .where(inArray(schema.users.id, [...new Set(rows.map((row) => row.ownerId))])),
  ]);

  const ownerById = new Map(owners.map((owner) => [owner.id, owner]));

  return rows.map((row) => {
    const days = blocked.get(row.id) ?? [];
    const owner = ownerById.get(row.ownerId);
    return mapOffer(row, days, firstFreeDay(days), {
      // Stored as numeric, which the driver hands back as a string.
      rating: Number(owner?.rating ?? 0),
      rentalsCount: owner?.rentalsCount ?? 0,
    });
  });
}

/**
 * Stamps each vehicle with the id of its rental offer, if it has one.
 *
 * The mock listings carry this inline; in the database the relationship is
 * owned by the offer, so it is filled in on read — once per batch rather than
 * once per card.
 */
async function withRentalOffers<T extends CatalogItem>(items: T[]): Promise<T[]> {
  const vehicleIds = items.filter((item) => item.kind === "vehicle").map((item) => item.id);
  if (vehicleIds.length === 0) return items;

  const rows = await db
    .select({ id: schema.rentalOffers.id, listingId: schema.rentalOffers.listingId })
    .from(schema.rentalOffers)
    .where(inArray(schema.rentalOffers.listingId, vehicleIds));

  const offerByListing = new Map(rows.map((row) => [row.listingId, row.id]));
  return items.map((item) => {
    const offerId = item.kind === "vehicle" ? offerByListing.get(item.id) : undefined;
    return offerId ? { ...item, rentalOfferId: offerId } : item;
  });
}

/* -------------------------------------------------------------------------- */
/*  Catalog                                                                    */
/* -------------------------------------------------------------------------- */

export async function getCatalogItem(id: string): Promise<CatalogItem | undefined> {
  const row = await db.query.listings.findFirst({ where: eq(schema.listings.id, id) });
  if (!row) return undefined;
  const [item] = await withRentalOffers([withNames(mapCatalogItem(row))]);
  return item;
}

export async function getListing(id: string): Promise<Listing | undefined> {
  const item = await getCatalogItem(id);
  return item?.kind === "vehicle" ? item : undefined;
}

export async function getUser(id: string): Promise<User | undefined> {
  const row = await db.query.users.findFirst({ where: eq(schema.users.id, id) });
  if (!row) return undefined;
  return { ...mapUser(row), listingsCount: await listingCountFor(id) };
}

export async function getOfferForListing(listingId: string): Promise<RentalOffer | undefined> {
  const row = await db.query.rentalOffers.findFirst({
    where: eq(schema.rentalOffers.listingId, listingId),
  });
  if (!row) return undefined;
  const [offer] = await loadOffers([row]);
  return offer;
}

export async function similarListings(listing: Listing, limit = 6): Promise<Listing[]> {
  const spread = Math.round(listing.price * 0.45);
  const rows = await db.query.listings.findMany({
    where: and(
      eq(schema.listings.status, "active"),
      eq(schema.listings.category, listing.category),
      ne(schema.listings.id, listing.id),
      gte(schema.listings.price, listing.price - spread),
      lte(schema.listings.price, listing.price + spread),
    ),
    limit,
  });
  const items = await withRentalOffers(rows.map((row) => withNames(mapCatalogItem(row))));
  return items.filter((i): i is Listing => i.kind === "vehicle");
}

/* -------------------------------------------------------------------------- */
/*  Search                                                                     */
/* -------------------------------------------------------------------------- */

function buildFilters(query: SearchQuery) {
  const clauses = [eq(schema.listings.status, "active")];

  if (query.category) clauses.push(eq(schema.listings.category, query.category));
  if (query.makeId) clauses.push(eq(schema.listings.makeId, query.makeId));
  if (query.modelId) clauses.push(eq(schema.listings.modelId, query.modelId));
  if (query.cityId) clauses.push(eq(schema.listings.cityId, query.cityId));
  if (query.districtId) clauses.push(eq(schema.listings.districtId, query.districtId));
  if (query.priceMin !== undefined) clauses.push(gte(schema.listings.price, query.priceMin));
  if (query.priceMax !== undefined) clauses.push(lte(schema.listings.price, query.priceMax));
  if (query.yearMin !== undefined) clauses.push(gte(schema.listings.year, query.yearMin));
  if (query.yearMax !== undefined) clauses.push(lte(schema.listings.year, query.yearMax));
  if (query.condition) {
    clauses.push(eq(schema.listings.condition, query.condition as "new" | "used"));
  }
  if (query.customsCleared) clauses.push(eq(schema.listings.customsCleared, true));
  if (query.delivery) clauses.push(eq(schema.listings.delivery, true));
  if (query.vipOnly) clauses.push(eq(schema.listings.vip, true));

  // "Has rental" is a relationship, not a column: it means an offer exists.
  if (query.hasRental) {
    clauses.push(
      sql`EXISTS (SELECT 1 FROM ${schema.rentalOffers} WHERE ${schema.rentalOffers.listingId} = ${schema.listings.id})`,
    );
  }

  if (query.q) {
    const term = `%${query.q.toLowerCase()}%`;
    clauses.push(
      or(
        sql`lower(${schema.listings.title}) LIKE ${term}`,
        sql`lower(coalesce(${schema.listings.brand}, '')) LIKE ${term}`,
      )!,
    );
  }

  // Category-specific attributes live in jsonb; numeric ones are treated as a
  // lower bound, matching how the filter sheet presents them.
  if (query.attributes) {
    for (const [key, value] of Object.entries(query.attributes)) {
      if (value === undefined || value === "") continue;
      if (typeof value === "number") {
        clauses.push(sql`(${schema.listings.attributes} ->> ${key})::numeric >= ${value}`);
      } else if (typeof value === "boolean") {
        clauses.push(sql`(${schema.listings.attributes} ->> ${key})::boolean = ${value}`);
      } else {
        clauses.push(sql`${schema.listings.attributes} ->> ${key} = ${value}`);
      }
    }
  }

  return and(...clauses);
}

function orderFor(sort: SearchQuery["sort"]) {
  // VIP always floats to the top of whatever ordering is chosen — that is the
  // product being sold, so it has to be visible in every sort.
  const vipFirst = desc(schema.listings.vip);
  switch (sort) {
    case "priceAsc":
      return [vipFirst, schema.listings.price];
    case "priceDesc":
      return [vipFirst, desc(schema.listings.price)];
    case "yearDesc":
      return [vipFirst, desc(schema.listings.year)];
    case "mileageAsc":
      return [vipFirst, sql`(${schema.listings.attributes} ->> 'mileage')::numeric ASC NULLS LAST`];
    default:
      return [vipFirst, desc(schema.listings.publishedAt)];
  }
}

export async function searchCatalog(
  query: SearchQuery,
  page = 1,
  pageSize = 40,
): Promise<Paginated<CatalogItem>> {
  const where = buildFilters(query);

  const [rows, [totals]] = await Promise.all([
    db
      .select()
      .from(schema.listings)
      .where(where)
      .orderBy(...orderFor(query.sort))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ n: count() }).from(schema.listings).where(where),
  ]);

  const total = totals?.n ?? 0;
  return {
    items: await withRentalOffers(rows.map((row) => withNames(mapCatalogItem(row)))),
    total,
    page,
    pageSize,
    hasMore: (page - 1) * pageSize + rows.length < total,
  };
}

export async function countMatches(query: SearchQuery): Promise<number> {
  const [row] = await db.select({ n: count() }).from(schema.listings).where(buildFilters(query));
  return row?.n ?? 0;
}

/* -------------------------------------------------------------------------- */
/*  Home                                                                       */
/* -------------------------------------------------------------------------- */

export async function getHomeFeed() {
  const [offerRows, vipRows, freshRows, partRows] = await Promise.all([
    db.select().from(schema.rentalOffers).limit(6),
    db.query.listings.findMany({
      where: and(eq(schema.listings.status, "active"), eq(schema.listings.vip, true)),
      limit: 6,
    }),
    db.query.listings.findMany({
      where: and(eq(schema.listings.status, "active"), eq(schema.listings.kind, "vehicle")),
      orderBy: desc(schema.listings.publishedAt),
      limit: 6,
    }),
    db.query.listings.findMany({
      where: and(eq(schema.listings.status, "active"), eq(schema.listings.kind, "part")),
      orderBy: desc(schema.listings.views),
      limit: 6,
    }),
  ]);

  const offers = await loadOffers(offerRows);
  const listingRows = await db.query.listings.findMany({
    where: inArray(
      schema.listings.id,
      offers.map((offer) => offer.listingId),
    ),
  });
  const rentalListings = await withRentalOffers(
    listingRows.map((row) => withNames(mapCatalogItem(row))),
  );
  const byId = new Map(rentalListings.map((item) => [item.id, item]));

  const rentals = offers
    .map((offer) => ({ listing: byId.get(offer.listingId), offer }))
    .filter((entry): entry is { listing: Listing; offer: RentalOffer } =>
      Boolean(entry.listing && entry.listing.kind === "vehicle"),
    )
    .sort((a, b) => a.offer.availableFrom.localeCompare(b.offer.availableFrom));

  const [vip, fresh, parts] = await Promise.all(
    [vipRows, freshRows, partRows].map((batch) =>
      withRentalOffers(batch.map((row) => withNames(mapCatalogItem(row)))),
    ),
  );

  return { rentals, vip: vip ?? [], fresh: fresh ?? [], parts: parts ?? [] };
}

/* -------------------------------------------------------------------------- */
/*  Seller                                                                     */
/* -------------------------------------------------------------------------- */

export async function getSellerProfile(sellerId: string) {
  const [userRow, itemRows, reviewRows, offerRows] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, sellerId) }),
    db.query.listings.findMany({
      where: and(eq(schema.listings.sellerId, sellerId), eq(schema.listings.status, "active")),
    }),
    db.query.reviews.findMany({
      where: eq(schema.reviews.targetId, sellerId),
      orderBy: desc(schema.reviews.createdAt),
    }),
    db.select().from(schema.rentalOffers).where(eq(schema.rentalOffers.ownerId, sellerId)),
  ]);

  if (!userRow) return undefined;

  const items = await withRentalOffers(itemRows.map((row) => withNames(mapCatalogItem(row))));
  return {
    user: { ...mapUser(userRow), listingsCount: items.length },
    listings: items.filter((item): item is Listing => item.kind === "vehicle"),
    parts: items.filter((item) => item.kind === "part"),
    offers: await loadOffers(offerRows),
    reviews: reviewRows.map(mapReview),
    rentalCount: offerRows.length,
  };
}

/* -------------------------------------------------------------------------- */
/*  Messaging and bookings                                                     */
/* -------------------------------------------------------------------------- */

async function hydrateThreads(
  rows: (typeof schema.chatThreads.$inferSelect)[],
  viewerId?: string,
) {
  if (rows.length === 0) return [] as ChatThread[];
  const ids = rows.map((row) => row.id);

  const [participants, messages] = await Promise.all([
    db
      .select()
      .from(schema.chatParticipants)
      .where(inArray(schema.chatParticipants.threadId, ids)),
    db.query.messages.findMany({
      where: inArray(schema.messages.threadId, ids),
      orderBy: schema.messages.createdAt,
    }),
  ]);

  return rows.map((row) =>
    mapThread(
      row,
      participants.filter((p) => p.threadId === row.id).map((p) => p.userId),
      messages.filter((m) => m.threadId === row.id).map(mapMessage),
      viewerId,
    ),
  );
}

export async function getInbox(userId: string): Promise<ChatThread[]> {
  const memberships = await db
    .select({ threadId: schema.chatParticipants.threadId })
    .from(schema.chatParticipants)
    .where(eq(schema.chatParticipants.userId, userId));

  if (memberships.length === 0) return [];

  const rows = await db.query.chatThreads.findMany({
    where: and(
      inArray(
        schema.chatThreads.id,
        memberships.map((m) => m.threadId),
      ),
      eq(schema.chatThreads.archived, false),
    ),
    orderBy: desc(schema.chatThreads.updatedAt),
  });

  return hydrateThreads(rows, userId);
}

export async function getThread(
  threadId: string,
  viewerId?: string,
): Promise<ChatThread | undefined> {
  const row = await db.query.chatThreads.findFirst({ where: eq(schema.chatThreads.id, threadId) });
  if (!row) return undefined;
  const [thread] = await hydrateThreads([row], viewerId);
  return thread;
}

function mapBooking(row: typeof schema.bookings.$inferSelect): Booking {
  return {
    id: row.id,
    code: row.code,
    offerId: row.offerId,
    listingId: row.listingId,
    renterId: row.renterId,
    ownerId: row.ownerId,
    start: toISODate(row.startDate),
    end: toISODate(row.endDate),
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

export async function getMyRentals(userId: string): Promise<Booking[]> {
  const rows = await db.query.bookings.findMany({
    where: eq(schema.bookings.renterId, userId),
    orderBy: desc(schema.bookings.createdAt),
  });
  return rows.map(mapBooking);
}
