import { NextResponse } from "next/server";

import { confirmVipOrder, rejectVipOrder } from "@/server/promotions";

/**
 * Somebody who can see the bank account deciding on a transfer.
 *
 * Confirming is the only thing in the product that grants VIP. Permission is
 * re-checked inside both functions, so reaching them from anywhere else is not
 * a way past this route.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let payload: { action?: unknown; note?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { action, note } = payload;
  if (action !== "confirm" && action !== "reject") {
    return NextResponse.json({ error: "action must be confirm or reject" }, { status: 400 });
  }

  const text = typeof note === "string" ? note : undefined;
  const result =
    action === "confirm" ? await confirmVipOrder(id, text) : await rejectVipOrder(id, text);

  if (result.ok) return NextResponse.json({ vipUntil: result.vipUntil ?? null });

  const status =
    result.reason === "notAllowed" ? 403 : result.reason === "notFound" ? 404 : 409;
  return NextResponse.json({ error: result.reason }, { status });
}
