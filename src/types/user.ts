import type { ArtTone, ID, ISODate, ISODateTime, LocalizedText } from "./common";
import type { CategorySlug } from "./taxonomy";

export type AccountKind = "private" | "shop" | "rental";

export type User = {
  id: ID;
  name: string;
  initials: string;
  avatarTone: ArtTone;
  kind: AccountKind;
  /** Absent on an account created by email that has not added one. */
  phone?: string;
  phoneVerified: boolean;
  /** The other way in. Absent on an account created by phone. */
  email?: string;
  /** "Verified shop" badge — a manual trust signal granted by an admin. */
  verifiedBadge: boolean;
  rating: number;
  reviewsCount: number;
  rentalsCount: number;
  listingsCount: number;
  memberSince: ISODate;
  /** Median reply time in minutes, surfaced as "replies in ~12 min". */
  responseMinutes: number;
  online: boolean;
  lastSeenAt?: ISODateTime;
  cityId: ID;
  districtId: ID;
  address?: LocalizedText;
  hours?: { open: string; close: string };
  bio?: LocalizedText;
  /** Shops and rental companies declare what they deal in. */
  specialties?: CategorySlug[];
  /** Paid subscription tier — drives the storefront and moderation bypass. */
  subscription?: "none" | "shop" | "shopPlus";
};

export type ReviewContext = "rental" | "sale" | "service";

export type Review = {
  id: ID;
  authorId: ID;
  targetId: ID;
  rating: number;
  text: LocalizedText;
  context: ReviewContext;
  /** What the review is about, e.g. "Vespa rental · July 2026". */
  subject: LocalizedText;
  createdAt: ISODateTime;
  /** Reviews can only be left after a completed transaction — that is what
   *  makes the rating trustworthy. */
  verifiedTransaction: boolean;
};

/** The signed-in persona for the prototype. */
export type Session = {
  userId: ID;
  authenticated: boolean;
  /** Toggles the admin console entry point in settings. */
  role: "user" | "moderator" | "admin";
};
