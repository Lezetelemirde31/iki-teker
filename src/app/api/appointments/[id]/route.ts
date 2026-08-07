import { NextResponse } from "next/server";

import {
  confirmAppointment,
  conflictReasons,
  declineAppointment,
} from "@/server/appointments";
import { currentUserId } from "@/server/session";

/**
 * The workshop answering a request.
 *
 * Ownership is re-derived inside the server module from the workshop the
 * appointment belongs to, so it cannot be bypassed by reaching those functions
 * from anywhere else. This route only translates the outcome into a status code.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const ownerId = await currentUserId();

  let payload: { action?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { action } = payload;
  if (action !== "confirm" && action !== "decline") {
    return NextResponse.json({ error: "action must be confirm or decline" }, { status: 400 });
  }

  const result =
    action === "confirm"
      ? await confirmAppointment(id, ownerId)
      : await declineAppointment(id, ownerId);

  if (result.ok) return NextResponse.json({ appointment: result.appointment });

  const status =
    result.reason === "notFound"
      ? 404
      : result.reason === "notOwner"
        ? 403
        : conflictReasons.has(result.reason)
          ? 409
          : result.reason === "alreadyDecided"
            ? 409
            : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
