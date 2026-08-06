import "server-only";

import type { ArtTone, Photo } from "@/types";

import { isSafeKey, listingPrefix, objectExists, publicUrl } from "./storage";

/**
 * The pictures a listing shows.
 *
 * Real photographs when the seller uploaded some, generated artwork when they
 * did not. The fallback is not a placeholder to be embarrassed about: it keeps
 * every card and gallery rendering correctly instead of leaving holes, and a
 * listing published in a hurry from a phone still looks like a listing.
 */

/** How many a seller may attach. Enough to show a bike from every side. */
export const MAX_PHOTOS = 8;

export async function photosFor(
  listingId: string,
  tone: ArtTone,
  alt: string,
  sellerId: string,
  keys: string[] | undefined,
): Promise<Photo[]> {
  const uploaded = await claimable(keys ?? [], sellerId);
  if (uploaded.length === 0) return generated(listingId, tone, alt);

  return uploaded.map((key, index) => ({
    id: `${listingId}-p${index + 1}`,
    // Kept so a photo that later fails to load still has artwork behind it.
    seed: `${listingId}-${index + 1}`,
    tone,
    alt: `${alt} — ${index + 1}`,
    key,
    url: publicUrl(key),
  }));
}

/**
 * Which of the claimed keys this person is actually allowed to publish.
 *
 * The list arrives from the client, so every entry is checked rather than
 * trusted: it has to be a well-formed key, filed under this seller's own
 * prefix, and actually present in storage. An upload that failed halfway would
 * otherwise become a listing with a picture that never loads — and unlike a
 * chat message, a listing is the thing buyers are looking at.
 */
async function claimable(keys: string[], sellerId: string): Promise<string[]> {
  const prefix = `${listingPrefix(sellerId)}/`;
  const candidates = [...new Set(keys)]
    .filter((key) => typeof key === "string" && isSafeKey(key) && key.startsWith(prefix))
    .slice(0, MAX_PHOTOS);

  const present = await Promise.all(candidates.map((key) => objectExists(key)));
  return candidates.filter((_, index) => present[index]);
}

/** Three frames of the generated artwork, the shape the seeded catalogue uses. */
function generated(listingId: string, tone: ArtTone, alt: string): Photo[] {
  return Array.from({ length: 3 }, (_, index) => ({
    id: `${listingId}-p${index + 1}`,
    seed: `${listingId}-${index + 1}`,
    tone,
    alt: `${alt} — ${index + 1}`,
  }));
}
