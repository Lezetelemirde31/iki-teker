import { NextResponse } from "next/server";

import { conflictReasons, requestAppointment } from "@/server/appointments";
import { currentUserId } from "@/server/session";

/**
 * Asking a workshop for a slot.
 *
 * The body names a service, a day and a start time. What that service costs and
 * how long it occupies the workshop are read from the menu on the server — a
 * price or an end time posted from here is ignored, not honoured.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const customerId = await currentUserId();

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { workshopId, serviceId, date, time, vehicleLabel, listingId, note } = payload;
  if (
    typeof workshopId !== "string" ||
    typeof serviceId !== "string" ||
    typeof date !== "string" ||
    typeof time !== "string" ||
    typeof vehicleLabel !== "string"
  ) {
    return NextResponse.json(
      { error: "workshopId, serviceId, date, time and vehicleLabel are required" },
      { status: 400 },
    );
  }

  const result = await requestAppointment(
    {
      workshopId,
      serviceId,
      date,
      time,
      vehicleLabel,
      ...(typeof listingId === "string" ? { listingId } : {}),
      ...(typeof note === "string" ? { note } : {}),
    },
    customerId,
  );

  if (result.ok) return NextResponse.json({ appointment: result.appointment }, { status: 201 });

  const status =
    result.reason === "notFound"
      ? 404
      : conflictReasons.has(result.reason)
        ? 409
        : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
