import { NextResponse } from "next/server";

import { parseSearchQuery } from "@/lib/search-params";
import { countMatches } from "@/server/data";

/**
 * How many listings the filter sheet's current draft would return.
 *
 * The sheet shows this on its apply button before the user commits, so it has
 * to be answered while the filters are still being edited — which means the
 * client asks. It reuses the same parser the search page uses, so the number on
 * the button and the results behind it can never disagree.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    raw[key] = value;
  });

  const count = await countMatches(parseSearchQuery(raw));
  return NextResponse.json({ count });
}
