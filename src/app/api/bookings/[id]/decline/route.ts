import { NextResponse } from "next/server";

import { declineBooking } from "@/server/bookings";
import { currentUserId } from "@/server/session";

/** The owner turns a pending request down. */
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await declineBooking(id, await currentUserId());

  if (result.ok) return NextResponse.json({ booking: result.booking });

  const status =
    result.reason === "notFound" ? 404 : result.reason === "notOwner" ? 403 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
