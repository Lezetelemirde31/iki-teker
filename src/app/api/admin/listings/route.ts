import { NextResponse } from "next/server";

import { createListingAs } from "@/server/admin-listings";
import type { ListingDraft } from "@/server/listings";

/**
 * Publishing listings from the panel, one or many.
 *
 * The same endpoint for both: a single listing is an array of one, and having
 * two code paths that build listings differently is how they drift apart.
 *
 * Every listing names the account it belongs to, and every creation is written
 * to the audit log with both that name and the name of whoever was signed in.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Entry = { sellerId?: unknown; status?: unknown; draft?: unknown };

export async function POST(request: Request) {
  let payload: { items?: unknown } | Entry;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const raw = Array.isArray((payload as { items?: unknown }).items)
    ? ((payload as { items: unknown[] }).items as Entry[])
    : [payload as Entry];

  if (raw.length === 0) return NextResponse.json({ error: "empty" }, { status: 400 });
  // A cap, because one request that creates a thousand rows is a request that
  // times out halfway and leaves nobody sure what happened.
  if (raw.length > 100) return NextResponse.json({ error: "tooMany" }, { status: 422 });

  const created: string[] = [];
  const failed: { index: number; reason: string; field?: string }[] = [];

  // Sequential rather than parallel: each one validates against the same
  // taxonomy and writes one row, and a hundred at once would give the database
  // no benefit and the failure report no order.
  for (const [index, entry] of raw.entries()) {
    if (typeof entry.sellerId !== "string" || typeof entry.draft !== "object" || !entry.draft) {
      failed.push({ index, reason: "invalidEntry" });
      continue;
    }

    const status = entry.status === "moderation" ? "moderation" : "active";
    const result = await createListingAs(
      entry.sellerId,
      entry.draft as ListingDraft,
      status,
    );

    if (result.ok) created.push(result.id);
    else failed.push({ index, reason: result.reason, ...(result.field ? { field: result.field } : {}) });
  }

  // 403 only when nothing could be attempted — a permission problem is about
  // the caller, not the payload.
  if (created.length === 0 && failed.every((f) => f.reason === "notAllowed")) {
    return NextResponse.json({ error: "notAllowed" }, { status: 403 });
  }

  return NextResponse.json(
    { created: created.length, ids: created, failed },
    { status: created.length > 0 ? 201 : 422 },
  );
}
