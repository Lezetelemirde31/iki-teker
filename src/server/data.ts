import "server-only";

import * as mocks from "@/lib/queries";
import { directoryOrder } from "@/mocks/services";
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

import * as database from "./db-queries";
import { useDatabase } from "./source";

/**
 * The screens' data access.
 *
 * Every function is async and returns the same domain types regardless of where
 * the data came from, so a screen cannot tell the difference — and switching
 * source is one environment variable rather than a rewrite. The mock branch is
 * the existing synchronous implementation, wrapped: it is already written and
 * exercised, so keeping it costs almost nothing and keeps the deployed demo
 * working until a database is attached.
 *
 * Reference data (cities, districts, makes, models, categories) is not routed
 * through here — it is static and read in-process by both branches.
 */

export async function getHomeFeed() {
  // Workshops have no table yet, so they come from the seeded directory in both
  // branches rather than being dropped from the screen.
  const workshops = directoryOrder.slice(0, 4);

  if (!useDatabase) {
    const feed = mocks.getHomeFeed();
    return { rentals: feed.rentals, vip: feed.vip, fresh: feed.fresh, parts: feed.parts, workshops };
  }

  return { ...(await database.getHomeFeed()), workshops };
}

export async function searchCatalog(
  query: SearchQuery,
  page = 1,
  pageSize = 40,
): Promise<Paginated<CatalogItem>> {
  if (!useDatabase) return mocks.searchCatalog(query, page, pageSize);
  return database.searchCatalog(query, page, pageSize);
}

/** Drives the filter sheet's live "show N listings" button. */
export async function countMatches(query: SearchQuery): Promise<number> {
  if (!useDatabase) return mocks.countMatches(query);
  return database.countMatches(query);
}

export async function getCatalogItem(id: string): Promise<CatalogItem | undefined> {
  if (!useDatabase) return mocks.getCatalogItem(id);
  return database.getCatalogItem(id);
}

export async function getListing(id: string): Promise<Listing | undefined> {
  if (!useDatabase) return mocks.getListing(id);
  return database.getListing(id);
}

export async function getUser(id: string): Promise<User | undefined> {
  if (!useDatabase) return mocks.getUser(id);
  return database.getUser(id);
}

export async function getOfferForListing(listingId: string): Promise<RentalOffer | undefined> {
  if (!useDatabase) return mocks.getOfferForListing(listingId);
  return database.getOfferForListing(listingId);
}

export async function similarListings(listing: Listing, limit = 6): Promise<Listing[]> {
  if (!useDatabase) return mocks.similarListings(listing, limit);
  return database.similarListings(listing, limit);
}

export async function getSellerProfile(sellerId: string) {
  if (!useDatabase) return mocks.getSellerProfile(sellerId);
  return database.getSellerProfile(sellerId);
}

export async function getInbox(userId: string): Promise<ChatThread[]> {
  if (!useDatabase) return mocks.getInbox(userId);
  return database.getInbox(userId);
}

/** `viewerId` decides what counts as unread — see `mapThread`. */
export async function getThread(
  threadId: string,
  viewerId?: string,
): Promise<ChatThread | undefined> {
  if (!useDatabase) return mocks.getThread(threadId);
  return database.getThread(threadId, viewerId);
}

export async function getMyRentals(userId: string): Promise<Booking[]> {
  if (!useDatabase) return mocks.getMyRentals(userId);
  return database.getMyRentals(userId);
}

/* -------------------------------------------------------------------------- */
/*  Pure and reference-data helpers                                            */
/* -------------------------------------------------------------------------- */

/**
 * These need no source branch. `quote` and the availability checks are pure
 * arithmetic over an offer that has already been loaded; `locationOf` reads
 * static reference data.
 */
export { isRangeAvailable, locationOf, quote, type Quote } from "@/lib/queries";
