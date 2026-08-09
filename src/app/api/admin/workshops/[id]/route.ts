import { NextResponse } from "next/server";

import { setWorkshopStatus, setWorkshopVerified } from "@/server/workshops";

/**
 * Letting a workshop into the directory, taking it out, or vouching for it.
 *
 * Permission is re-checked inside both server functions, so reaching them from
 * anywhere else is not a way past this route.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let payload: { status?: unknown; verified?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const result =
    typeof payload.verified === "boolean"
      ? await setWorkshopVerified(id, payload.verified)
      : typeof payload.status === "string"
        ? await setWorkshopStatus(id, payload.status)
        : null;

  if (!result) {
    return NextResponse.json({ error: "status or verified is required" }, { status: 400 });
  }

  if (result.ok) return NextResponse.json({ status: result.status });

  const status =
    result.reason === "notAllowed" ? 403 : result.reason === "notFound" ? 404 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
