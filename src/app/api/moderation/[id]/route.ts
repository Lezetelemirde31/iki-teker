import { NextResponse } from "next/server";

import { approveListing, rejectListing } from "@/server/moderation";

/**
 * A moderator's decision on a queued listing.
 *
 * Permission is checked inside the moderation module rather than here, so it
 * cannot be bypassed by reaching the same functions from anywhere else.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { action?: unknown; reason?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result =
    body.action === "approve"
      ? await approveListing(id)
      : body.action === "reject"
        ? await rejectListing(
            id,
            typeof body.reason === "string" ? body.reason : "",
            typeof body.note === "string" ? body.note : undefined,
          )
        : { ok: false as const, reason: "notFound" as const };

  if (result.ok) return NextResponse.json({ ok: true });

  const status =
    result.reason === "notAllowed"
      ? 403
      : result.reason === "notFound"
        ? 404
        : result.reason === "notPending"
          ? 409
          : 422;

  return NextResponse.json({ error: result.reason }, { status });
}
