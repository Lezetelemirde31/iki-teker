import { NextResponse } from "next/server";

import { deleteListing, setListingStatus } from "@/server/listing-actions";
import { currentUserId } from "@/server/session";

/**
 * A seller managing their own listing.
 *
 * Ownership is checked on the server for both verbs. The listing id is in the
 * URL of a public page, so anyone can read it — being able to delete a stranger's
 * motorcycle by pasting its id would be the obvious consequence of trusting the
 * client here.
 */
export const dynamic = "force-dynamic";

function statusFor(reason: string) {
  return reason === "notFound" ? 404 : reason === "notOwner" ? 403 : 422;
}

/** Mark sold, archive, or put back on sale. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let status: unknown;
  try {
    ({ status } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof status !== "string") {
    return NextResponse.json({ error: "status is required" }, { status: 400 });
  }

  const result = await setListingStatus(id, await currentUserId(), status);
  if (result.ok) return NextResponse.json({ ok: true, status });
  return NextResponse.json({ error: result.reason }, { status: statusFor(result.reason) });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await deleteListing(id, await currentUserId());
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: result.reason }, { status: statusFor(result.reason) });
}
