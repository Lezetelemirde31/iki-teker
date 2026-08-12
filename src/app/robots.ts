import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

/**
 * What a crawler may and may not touch.
 *
 * The panel and the API are refused rather than merely left out of the
 * sitemap: `/admin` already returns 404 to anyone without the capability, but
 * a crawler should not be spending its budget discovering that, and a search
 * result pointing at an administration screen helps nobody.
 *
 * Signed-in areas — the account, chats, favourites, the posting form — are
 * refused for the same reason: they render nothing useful without a session,
 * so indexing them would put empty pages in the results.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The app's pages carry a language prefix, so these have to match
        // /az/account as well as /en/account — a bare /account matches none of
        // them.
        disallow: ["/admin", "/api/", "/*/account", "/*/chats", "/*/favorites", "/*/post"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
