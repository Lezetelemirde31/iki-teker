import type { MetadataRoute } from "next";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { locales } from "@/i18n/config";
import { siteUrl } from "@/lib/site";
import { useDatabase } from "@/server/source";
import { desc, eq } from "drizzle-orm";

/**
 * What a search engine should crawl.
 *
 * Every public page in every language, because the market is trilingual and a
 * sitemap that names only the Azerbaijani pages tells Google the other two do
 * not exist.
 *
 * Listings are included from the database rather than a fixed list — a
 * marketplace whose sitemap stops at its section pages leaves its actual
 * content undiscovered, which is the content people search for. Only ones
 * that are live: a listing under moderation is not a page anyone should be
 * sent to, and one already sold should not be indexed as if it were on offer.
 *
 * Everything behind a sign-in is left out, and the panel is refused outright
 * in robots.txt.
 */
export const revalidate = 3600;

const SECTIONS = ["home", "search", "services"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    // The entry point, and the sections a visitor can reach without an account.
    entries.push({
      url: `${base}/${locale}/home`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    });

    for (const section of SECTIONS.slice(1)) {
      entries.push({
        url: `${base}/${locale}/${section}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  }

  if (!useDatabase) return entries;

  // A cap, because a sitemap is limited to 50,000 URLs and this multiplies by
  // the number of languages. Newest first, so if the marketplace ever outgrows
  // it the listings left out are the oldest ones.
  const listings = await db
    .select({ id: schema.listings.id, publishedAt: schema.listings.publishedAt })
    .from(schema.listings)
    .where(eq(schema.listings.status, "active"))
    .orderBy(desc(schema.listings.publishedAt))
    .limit(10_000);

  for (const listing of listings) {
    for (const locale of locales) {
      entries.push({
        url: `${base}/${locale}/listing/${listing.id}`,
        lastModified: listing.publishedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
