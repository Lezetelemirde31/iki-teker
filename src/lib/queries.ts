import {
  activeListings,
  activeParts,
  adminMetrics,
  appointmentsFor,
  bookings,
  bookingsForOwner,
  bookingsForRenter,
  cityById,
  directoryOrder,
  districtById,
  listingById,
  listingsBySeller,
  monthlyIncome,
  moderationQueue,
  notifications,
  offerByListingId,
  offerById,
  offersByOwner,
  partById,
  partsBySeller,
  pendingRequestsForOwner,
  popularParts,
  rentalOffers,
  reviewsFor,
  savedSearches,
  threadById,
  threadsFor,
  userById,
  workshopById,
  workshops,
} from "@/mocks";
import type {
  Booking,
  CatalogItem,
  Listing,
  Paginated,
  Part,
  RentalOffer,
  SearchQuery,
  SortOption,
  VehicleCategorySlug,
  Workshop,
} from "@/types";

import { daysBetween, datesBetween, toISODate } from "./demo-clock";
import { withDelay } from "./utils";

/**
 * The prototype's data-access layer.
 *
 * Every read is an in-memory operation over the seeded datasets. Selectors are
 * synchronous so server components can render without ceremony; the `load*`
 * wrappers add simulated latency where a screen should show its skeleton.
 */

/* ========================================================================== */
/*  Catalog search                                                             */
/* ========================================================================== */

function matchesAttributes(item: CatalogItem, filters: SearchQuery["attributes"]) {
  if (!filters) return true;

  return Object.entries(filters).every(([key, expected]) => {
    const actual = item.attributes[key];
    if (expected === undefined || expected === "") return true;
    if (typeof expected === "boolean") return actual === expected;
    if (typeof expected === "number") return typeof actual === "number" && actual >= expected;
    return String(actual) === String(expected);
  });
}

function matchesText(item: CatalogItem, term: string) {
  const haystack = [
    item.title,
    item.kind === "vehicle" ? item.makeName : item.brand,
    item.kind === "vehicle" ? item.modelName : (item.partNumber ?? ""),
    String(item.kind === "vehicle" ? item.year : ""),
  ]
    .join(" ")
    .toLowerCase();

  return term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => haystack.includes(token));
}

function applyFilters(items: CatalogItem[], query: SearchQuery): CatalogItem[] {
  return items.filter((item) => {
    if (query.q && !matchesText(item, query.q)) return false;
    if (query.cityId && item.cityId !== query.cityId) return false;
    if (query.districtId && item.districtId !== query.districtId) return false;
    if (query.priceMin !== undefined && item.price < query.priceMin) return false;
    if (query.priceMax !== undefined && item.price > query.priceMax) return false;
    if (query.condition && item.condition !== query.condition) return false;
    if (query.delivery && !item.delivery) return false;
    if (query.vipOnly && !item.promotion.vip) return false;
    if (!matchesAttributes(item, query.attributes)) return false;

    if (item.kind === "vehicle") {
      if (query.category && item.category !== query.category) return false;
      if (query.makeId && item.makeId !== query.makeId) return false;
      if (query.modelId && item.modelId !== query.modelId) return false;
      if (query.yearMin !== undefined && item.year < query.yearMin) return false;
      if (query.yearMax !== undefined && item.year > query.yearMax) return false;
      if (query.customsCleared && !item.customsCleared) return false;
      // "Has rental" — one tap separating what you can take for a day from
      // what is only for sale.
      if (query.hasRental && !item.rentalOfferId) return false;
    } else {
      if (query.category && item.category !== query.category) return false;
      if (query.hasRental) return false;
    }

    return true;
  });
}

function sortItems(items: CatalogItem[], sort: SortOption = "newest"): CatalogItem[] {
  const sorted = [...items];

  switch (sort) {
    case "priceAsc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "priceDesc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "mileageAsc":
      sorted.sort(
        (a, b) => Number(a.attributes.mileage ?? Infinity) - Number(b.attributes.mileage ?? Infinity),
      );
      break;
    case "yearDesc":
      sorted.sort((a, b) => {
        const yearA = a.kind === "vehicle" ? a.year : 0;
        const yearB = b.kind === "vehicle" ? b.year : 0;
        return yearB - yearA;
      });
      break;
    case "nearest":
      sorted.sort((a, b) => (a.cityId ?? "￿").localeCompare(b.cityId ?? "￿"));
      break;
    default:
      sorted.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  // VIP always floats to the top of its sort group — that is the product being
  // sold, and it must be visible in every ordering.
  return sorted.sort((a, b) => Number(b.promotion.vip) - Number(a.promotion.vip));
}

function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    total: items.length,
    page,
    pageSize,
    hasMore: start + slice.length < items.length,
  };
}

const catalogPool: CatalogItem[] = [...activeListings, ...activeParts];

export function searchCatalog(query: SearchQuery, page = 1, pageSize = 20): Paginated<CatalogItem> {
  const filtered = applyFilters(catalogPool, query);
  return paginate(sortItems(filtered, query.sort), page, pageSize);
}

/** Result count only — used to label the filter sheet's apply button live. */
export function countMatches(query: SearchQuery): number {
  return applyFilters(catalogPool, query).length;
}

export function loadSearchResults(query: SearchQuery, page = 1, pageSize = 20) {
  return withDelay(searchCatalog(query, page, pageSize), 420);
}

/* ========================================================================== */
/*  Single entities                                                            */
/* ========================================================================== */

export function getListing(id: string): Listing | undefined {
  return listingById.get(id);
}

export function getPart(id: string): Part | undefined {
  return partById.get(id);
}

export function getCatalogItem(id: string): CatalogItem | undefined {
  return listingById.get(id) ?? partById.get(id);
}

export function getUser(id: string) {
  return userById.get(id);
}

export function getCity(id: string) {
  return cityById.get(id);
}

export function getDistrict(id: string) {
  return districtById.get(id);
}

export function getWorkshop(id: string): Workshop | undefined {
  return workshopById.get(id);
}

/** Location line for a card: "Baku, Yasamal". */
export function locationOf(item: { cityId?: string; districtId?: string }) {
  return {
    city: item.cityId ? cityById.get(item.cityId) : undefined,
    district: item.districtId ? districtById.get(item.districtId) : undefined,
  };
}

/**
 * The single most useful place label for a compact card.
 *
 * In Baku the district is what tells listings apart; elsewhere the districts
 * are just "city centre", so the city name carries the information instead.
 */
export function placeLabel(item: { cityId?: string; districtId?: string }) {
  const city = item.cityId ? cityById.get(item.cityId) : undefined;
  const district = item.districtId ? districtById.get(item.districtId) : undefined;
  return city?.primary && district ? district.name : city?.name;
}

/** Listings from the same category and a comparable price band. */
export function similarListings(listing: Listing, limit = 6): Listing[] {
  return activeListings
    .filter(
      (candidate) =>
        candidate.id !== listing.id &&
        candidate.category === listing.category &&
        Math.abs(candidate.price - listing.price) < listing.price * 0.45,
    )
    .slice(0, limit);
}

/* ========================================================================== */
/*  Rental                                                                     */
/* ========================================================================== */

export function getOffer(id: string): RentalOffer | undefined {
  return offerById.get(id);
}

export function getOfferForListing(listingId: string): RentalOffer | undefined {
  return offerByListingId.get(listingId);
}

/** Every rentable listing, paired with its terms. */
export function rentableListings(): { listing: Listing; offer: RentalOffer }[] {
  return rentalOffers
    .map((offer) => ({ listing: listingById.get(offer.listingId), offer }))
    .filter((entry): entry is { listing: Listing; offer: RentalOffer } => Boolean(entry.listing));
}

/** Free today first, then by soonest availability — the home rail's order. */
export function availableToRent(limit = 8) {
  return rentableListings()
    .sort((a, b) => a.offer.availableFrom.localeCompare(b.offer.availableFrom))
    .slice(0, limit);
}

export function blockedDateSet(offer: RentalOffer): Set<string> {
  return new Set(offer.blockedDates);
}

export function isDateBlocked(offer: RentalOffer, date: Date | string) {
  const iso = typeof date === "string" ? date : toISODate(date);
  return offer.blockedDates.includes(iso);
}

/**
 * A range is bookable only if every day in it is free. This is the client-side
 * mirror of the database constraint that makes double-booking impossible.
 */
export function isRangeAvailable(offer: RentalOffer, start: string, end: string) {
  const blocked = blockedDateSet(offer);
  return datesBetween(start, end).every((date) => !blocked.has(date));
}

export type Quote = {
  days: number;
  dayPrice: number;
  subtotal: number;
  serviceFee: number;
  deposit: number;
  total: number;
  commission: number;
  longStayApplied: boolean;
  belowMinimum: boolean;
};

/**
 * Live price calculation: the renter sees the total before sending the request,
 * so there is nothing to argue about at handover.
 */
export function quote(offer: RentalOffer, start: string, end: string): Quote {
  const days = daysBetween(start, end);
  const longStay = offer.rates.longStay;
  const longStayApplied = Boolean(longStay && days >= longStay.minDays);
  const dayPrice = longStayApplied && longStay ? longStay.dayPrice : offer.rates.day;
  const subtotal = dayPrice * days;
  // Renters pay no service fee while the platform is cash-only; the commission
  // is taken from the owner's side.
  const serviceFee = 0;

  return {
    days,
    dayPrice,
    subtotal,
    serviceFee,
    deposit: offer.deposit,
    total: subtotal + serviceFee + offer.deposit,
    commission: Math.round(subtotal * offer.commissionRate * 100) / 100,
    longStayApplied,
    belowMinimum: days < offer.minDays,
  };
}

export function getBooking(id: string): Booking | undefined {
  return bookings.find((booking) => booking.id === id);
}

/* ========================================================================== */
/*  Home feed                                                                  */
/* ========================================================================== */

export function getHomeFeed() {
  return {
    rentals: availableToRent(8),
    vip: activeListings.filter((listing) => listing.promotion.vip).slice(0, 8),
    fresh: [...activeListings]
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 8),
    parts: popularParts.slice(0, 8),
    workshops: directoryOrder.slice(0, 4),
  };
}

export function loadHomeFeed() {
  return withDelay(getHomeFeed(), 360);
}

/* ========================================================================== */
/*  Seller profile                                                             */
/* ========================================================================== */

export function getSellerProfile(sellerId: string) {
  const user = userById.get(sellerId);
  if (!user) return undefined;

  const sellerListings = listingsBySeller(sellerId).filter(
    (listing) => listing.status === "active",
  );
  const sellerParts = partsBySeller(sellerId).filter((part) => part.status === "active");
  const offers = offersByOwner(sellerId);

  return {
    user,
    listings: sellerListings,
    parts: sellerParts,
    offers,
    reviews: reviewsFor(sellerId),
    rentalCount: offers.length,
  };
}

/* ========================================================================== */
/*  Seller dashboard                                                           */
/* ========================================================================== */

export function getDashboard(userId: string) {
  // A seller's workspace covers everything they have posted — vehicles and
  // parts alike — so the counters match what they see in "My listings".
  const owned: CatalogItem[] = [...listingsBySeller(userId), ...partsBySeller(userId)];
  const active = owned.filter((item) => item.status === "active");
  const inModeration = owned.filter((item) => item.status === "moderation");
  const drafts = owned.filter((item) => item.status === "draft");
  const ownerBookings = bookingsForOwner(userId);

  return {
    user: userById.get(userId),
    active,
    inModeration,
    drafts,
    stats: {
      activeCount: active.length,
      views: owned.reduce((total, item) => total + item.stats.views, 0),
      contacts: owned.reduce((total, item) => total + item.stats.contacts, 0),
    },
    bookings: ownerBookings,
    pendingRequests: pendingRequestsForOwner(userId),
    offers: offersByOwner(userId),
    monthlyIncome: monthlyIncome(userId, "2026-07"),
  };
}

/* ========================================================================== */
/*  Personal collections                                                       */
/* ========================================================================== */

export function getInbox(userId: string) {
  return threadsFor(userId);
}

export function getThread(threadId: string) {
  return threadById.get(threadId);
}

export function getNotifications() {
  return [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSavedSearches() {
  return savedSearches;
}

export function getMyRentals(userId: string) {
  return bookingsForRenter(userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMyAppointments(userId: string) {
  return appointmentsFor(userId);
}

/* ========================================================================== */
/*  Services directory                                                         */
/* ========================================================================== */

export function getWorkshops(options: { specialty?: string; mobileOnly?: boolean } = {}) {
  return directoryOrder.filter((workshop) => {
    if (options.specialty && !workshop.specialties.includes(options.specialty as never)) return false;
    if (options.mobileOnly && !workshop.mobileService) return false;
    return true;
  });
}

export function loadWorkshops(options?: Parameters<typeof getWorkshops>[0]) {
  return withDelay(getWorkshops(options), 300);
}

/* ========================================================================== */
/*  Admin console                                                              */
/* ========================================================================== */

export function getAdminOverview() {
  return {
    metrics: adminMetrics,
    queue: moderationQueue,
    flaggedCount: moderationQueue.filter((item) => item.flags.length > 0).length,
  };
}

/* ========================================================================== */
/*  Category helpers                                                           */
/* ========================================================================== */

export function categoryCounts(): Record<VehicleCategorySlug | "parts" | "gear", number> {
  return {
    motorcycles: activeListings.filter((listing) => listing.category === "motorcycles").length,
    scooters: activeListings.filter((listing) => listing.category === "scooters").length,
    electric: activeListings.filter((listing) => listing.category === "electric").length,
    bicycles: activeListings.filter((listing) => listing.category === "bicycles").length,
    parts: activeParts.filter((part) => part.category === "parts").length,
    gear: activeParts.filter((part) => part.category === "gear").length,
  };
}

export { workshops };
