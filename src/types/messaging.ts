import type { ID, ISODateTime, LocalizedText } from "./common";
import type { SortOption } from "./taxonomy";

export type MessageKind = "text" | "file" | "image" | "system";

export type Message = {
  id: ID;
  threadId: ID;
  authorId: ID;
  kind: MessageKind;
  /**
   * Verbatim, not localized. Real conversations in Baku code-switch between
   * Azerbaijani and Russian, and the source prototype shows exactly that —
   * translating it would make the demo less credible, not more.
   */
  body?: string;
  fileName?: string;
  fileSize?: string;
  createdAt: ISODateTime;
  readByRecipient: boolean;
};

export type ChatThread = {
  id: ID;
  participantIds: ID[];
  /** Listing pinned to the top of the thread for context. */
  listingId?: ID;
  bookingId?: ID;
  messages: Message[];
  unreadCount: number;
  updatedAt: ISODateTime;
  /**
   * For rentals, contact details unlock only after the booking is confirmed —
   * if deals move to WhatsApp the platform earns nothing.
   */
  contactRevealed: boolean;
  archived: boolean;
};

export type NotificationKind =
  | "savedSearch"
  | "booking"
  | "message"
  | "moderation"
  | "promotion"
  | "review"
  | "priceDrop";

export type AppNotification = {
  id: ID;
  kind: NotificationKind;
  title: LocalizedText;
  body: LocalizedText;
  href: string;
  createdAt: ISODateTime;
  read: boolean;
  entityId?: ID;
};

/** Filter state, shared by the search screen, saved searches and alerts. */
export type SearchQuery = {
  q?: string;
  category?: string;
  makeId?: ID;
  modelId?: ID;
  cityId?: ID;
  districtId?: ID;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  hasRental?: boolean;
  customsCleared?: boolean;
  delivery?: boolean;
  condition?: string;
  vipOnly?: boolean;
  sort?: SortOption;
  /** Category-specific attribute filters, keyed by `AttributeDef.key`. */
  attributes?: Record<string, string | number | boolean>;
};

export type SavedSearch = {
  id: ID;
  label: string;
  query: SearchQuery;
  /** New matches since the user last opened it — the return-traffic hook. */
  newMatches: number;
  notify: boolean;
  createdAt: ISODateTime;
};
