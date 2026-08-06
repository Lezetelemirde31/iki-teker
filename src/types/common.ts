import type { Locale } from "@/i18n/config";

export type ID = string;

/** Date without time, e.g. "2026-08-08". */
export type ISODate = string;

/** Full timestamp, e.g. "2026-07-27T14:02:00+04:00" (Baku is UTC+4). */
export type ISODateTime = string;

/**
 * Content that exists in all three locales. Used for taxonomy and for seeded
 * user content (descriptions, reviews) so the demo reads naturally in whichever
 * language it is shown in. Chat messages are a deliberate exception — they keep
 * the authentic Azerbaijani/Russian code-switching of the source prototype.
 */
export type LocalizedText = Record<Locale, string>;

export type Currency = "AZN";

export type Money = {
  amount: number;
  currency: Currency;
};

/**
 * Colour families for generated listing artwork. The prototype uses flat
 * gradient plates with a vehicle silhouette rather than photography, so mock
 * listings carry a tone plus a deterministic seed instead of an image URL —
 * nothing to load, nothing to break during a demo.
 */
export type ArtTone = "sand" | "clay" | "olive" | "sage" | "slate" | "steel" | "dusk" | "amber";

export type Photo = {
  id: ID;
  /** Deterministic seed for the generated silhouette + gradient. */
  seed: string;
  tone: ArtTone;
  alt: string;
  /**
   * A real picture, when the seller uploaded one.
   *
   * The row stores `key`; `url` is worked out on read from wherever files are
   * currently served. Both absent means the generated artwork *is* the photo —
   * which is what every seeded listing still is, and what a listing published
   * without pictures falls back to rather than showing a hole.
   */
  key?: string;
  url?: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
