import { NextResponse } from "next/server";

import { confirmBooking, conflictReasons } from "@/server/bookings";
import { currentUserId } from "@/server/session";

/**
 * The owner accepts a pending request.
 *
 * This is where the no-double-booking guarantee is actually enforced: the
 * update flips the row to `confirmed`, and the database's exclusion constraint
 * refuses it if those dates are already confirmed for the same vehicle. Two
 * owners clicking accept at the same instant cannot both win.
 */
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await confirmBooking(id, await currentUserId());

  if (result.ok) return NextResponse.json({ booking: result.booking });

  const status = conflictReasons.has(result.reason)
    ? 409
    : result.reason === "notFound"
      ? 404
      : result.reason === "notOwner"
        ? 403
        : 422;

  return NextResponse.json({ error: result.reason }, { status });
}
