import "server-only";

import type { InferSelectModel } from "drizzle-orm";

import type * as schema from "@/db/schema";
import type {
  ArtTone,
  CatalogItem,
  ChatThread,
  City,
  District,
  Listing,
  Message,
  Part,
  RentalOffer,
  Review,
  User,
} from "@/types";

/**
 * Database rows to domain objects.
 *
 * The screens already consume the domain types, so mapping here rather than
 * reshaping the UI means the entire front end is unaware of where its data came
 * from. That is also what lets the mock source stay a drop-in alternative.
 */

type ListingRow = InferSelectModel<typeof schema.listings>;
type OfferRow = InferSelectModel<typeof schema.rentalOffers>;
type UserRow = InferSelectModel<typeof schema.users>;
type CityRow = InferSelectModel<typeof schema.cities>;
type DistrictRow = InferSelectModel<typeof schema.districts>;
type ReviewRow = InferSelectModel<typeof schema.reviews>;
type MessageRow = InferSelectModel<typeof schema.messages>;
type ThreadRow = InferSelectModel<typeof schema.chatThreads>;

/** Postgres `date` columns come back as Date objects; the domain uses ISO days. */
export function toISODate(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toISOTime(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export function mapCity(row: CityRow): City {
  return {
    id: row.id,
    name: row.name,
    coords: { lat: Number(row.lat), lng: Number(row.lng) },
    primary: row.primary,
  };
}

export function mapDistrict(row: DistrictRow): District {
  return { id: row.id, cityId: row.cityId, name: row.name };
}

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    avatarTone: row.avatarTone as ArtTone,
    kind: row.kind,
    phone: row.phone,
    phoneVerified: row.phoneVerified,
    verifiedBadge: row.verifiedBadge,
    rating: Number(row.rating),
    reviewsCount: row.reviewsCount,
    rentalsCount: row.rentalsCount,
    listingsCount: 0, // filled by the caller, which knows the query scope
    memberSince: toISODate(row.memberSince),
    responseMinutes: row.responseMinutes,
    online: row.online,
    lastSeenAt: row.lastSeenAt ? toISOTime(row.lastSeenAt) : undefined,
    cityId: row.cityId ?? "",
    districtId: row.districtId ?? "",
    address: row.address ?? undefined,
    hours: row.hours ?? undefined,
    bio: row.bio ?? undefined,
    specialties: (row.specialties as User["specialties"]) ?? undefined,
    subscription: (row.subscription as User["subscription"]) ?? "none",
  };
}

export function mapCatalogItem(row: ListingRow): CatalogItem {
  const shared = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    price: row.price,
    negotiable: row.negotiable,
    condition: row.condition,
    description: row.description,
    photos: row.photos as CatalogItem["photos"],
    attributes: row.attributes,
    sellerId: row.sellerId,
    cityId: row.cityId,
    districtId: row.districtId,
    delivery: row.delivery,
    status: row.status,
    promotion: {
      vip: row.vip,
      vipUntil: row.vipUntil ? toISODate(row.vipUntil) : undefined,
      bumpsLeft: row.bumpsLeft ?? undefined,
      lastBumpedAt: row.lastBumpedAt ? toISOTime(row.lastBumpedAt) : undefined,
    },
    stats: { views: row.views, contacts: row.contacts, favorites: row.favorites },
    publishedAt: toISOTime(row.publishedAt),
  };

  if (row.kind === "vehicle") {
    const listing: Listing = {
      ...shared,
      kind: "vehicle",
      category: row.category as Listing["category"],
      makeId: row.makeId ?? "",
      modelId: row.modelId ?? "",
      // Denormalised on read: every card shows the make and model as text, and
      // joining two reference tables for a label on every row is not worth it.
      makeName: "",
      modelName: "",
      year: row.year ?? 0,
      customsCleared: row.customsCleared ?? false,
    };
    return listing;
  }

  const part: Part = {
    ...shared,
    kind: "part",
    category: row.category as Part["category"],
    partType: row.partType as Part["partType"],
    brand: row.brand ?? "",
    partNumber: row.partNumber ?? undefined,
    stock: row.stock ?? 0,
    compatibility: (row.compatibility as Part["compatibility"]) ?? [],
    localizedTitle: row.localizedTitle ?? { az: row.title, en: row.title, ru: row.title },
  };
  return part;
}

/**
 * The owner's rating and completed-rental count are stored on the user, not the
 * offer, but the rental card shows them next to the price — so they are passed
 * in rather than looked up here, letting the caller fetch every owner at once.
 */
export function mapOffer(
  row: OfferRow,
  blackouts: string[],
  availableFrom: string,
  owner: { rating: number; rentalsCount: number },
): RentalOffer {
  return {
    id: row.id,
    listingId: row.listingId,
    ownerId: row.ownerId,
    rates: {
      hour: row.ratePerHour ?? undefined,
      day: row.ratePerDay,
      week: row.ratePerWeek ?? undefined,
      longStay:
        row.longStayMinDays && row.longStayDayPrice
          ? { minDays: row.longStayMinDays, dayPrice: row.longStayDayPrice }
          : undefined,
    },
    deposit: row.deposit,
    minDays: row.minDays,
    maxDays: row.maxDays,
    licenceRequired: row.licenceRequired,
    freeCancellationHours: row.freeCancellationHours,
    pickup: row.pickup,
    includes: row.includes as RentalOffer["includes"],
    blockedDates: blackouts,
    availableFrom,
    handoverTime: row.handoverTime,
    instantBook: row.instantBook,
    rating: owner.rating,
    rentalsCount: owner.rentalsCount,
    commissionRate: Number(row.commissionRate),
  };
}

export function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    authorId: row.authorId,
    targetId: row.targetId,
    rating: row.rating,
    text: row.text,
    context: row.context,
    subject: row.subject,
    createdAt: toISOTime(row.createdAt),
    verifiedTransaction: row.verifiedTransaction,
  };
}

export function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    threadId: row.threadId,
    authorId: row.authorId,
    kind: row.kind,
    body: row.body ?? undefined,
    fileName: row.fileName ?? undefined,
    fileSize: row.fileSize ?? undefined,
    createdAt: toISOTime(row.createdAt),
    readByRecipient: row.readByRecipient,
  };
}

export function mapThread(
  row: ThreadRow,
  participantIds: string[],
  messages: Message[],
  /** Whose inbox this is. Unread and archived both mean *for them*. */
  viewerId?: string,
  archivedByViewer = false,
): ChatThread {
  return {
    id: row.id,
    participantIds,
    listingId: row.listingId ?? undefined,
    bookingId: row.bookingId ?? undefined,
    messages,
    // Only the other person's messages count. `readByRecipient` is false on
    // everything you have just sent — it means "they have not read it yet" —
    // so counting it here made your own inbox show a badge for your own words.
    unreadCount: messages.filter(
      (message) => !message.readByRecipient && message.authorId !== viewerId,
    ).length,
    updatedAt: toISOTime(row.updatedAt),
    contactRevealed: row.contactRevealed,
    archived: archivedByViewer,
  };
}
