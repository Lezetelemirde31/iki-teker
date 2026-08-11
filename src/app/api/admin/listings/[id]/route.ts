import { NextResponse } from "next/server";

import { updateListingFromPanel } from "@/server/admin-listings";

/** Moving a listing between states, or granting VIP by hand. */
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let payload: { status?: unknown; vip?: unknown; vipDays?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const change: { status?: string; vip?: boolean; vipDays?: number } = {};
  if (typeof payload.status === "string") change.status = payload.status;
  if (typeof payload.vip === "boolean") change.vip = payload.vip;
  if (typeof payload.vipDays === "number") change.vipDays = payload.vipDays;

  if (Object.keys(change).length === 0) {
    return NextResponse.json({ error: "status or vip is required" }, { status: 400 });
  }

  const result = await updateListingFromPanel(id, change);
  if (result.ok) return NextResponse.json({ ok: true });

  const status =
    result.reason === "notAllowed" ? 403 : result.reason === "notFound" ? 404 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
