import { NextResponse } from "next/server";

import { openThread } from "@/server/messaging";
import { currentUserId } from "@/server/session";

/**
 * Opening the conversation about a listing.
 *
 * Returns the existing thread when there is one, so tapping "message seller"
 * twice continues the conversation instead of starting a second one.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let listingId: unknown;
  try {
    ({ listingId } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof listingId !== "string" || !listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }

  const result = await openThread(listingId, await currentUserId());

  if (result.ok) return NextResponse.json({ threadId: result.threadId });

  const status = result.reason === "notFound" ? 404 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
