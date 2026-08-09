import { NextResponse } from "next/server";

import { setReviewHidden } from "@/server/reviews";

/**
 * Hiding a review, or putting it back.
 *
 * Permission is re-checked inside `setReviewHidden`, so reaching that function
 * from anywhere else is not a way around this route.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let payload: { hidden?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof payload.hidden !== "boolean") {
    return NextResponse.json({ error: "hidden must be a boolean" }, { status: 400 });
  }

  const result = await setReviewHidden(id, payload.hidden);
  if (result.ok) return NextResponse.json({ hidden: result.hidden });

  const status = result.reason === "notAllowed" ? 403 : 404;
  return NextResponse.json({ error: result.reason }, { status });
}
