import { NextResponse } from "next/server";

import { resolveComplaint } from "@/server/complaints";

/**
 * A moderator closing a report.
 *
 * Permission is checked inside the complaints module rather than here, so it
 * cannot be bypassed by reaching the same function from anywhere else.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: { outcome?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (body.outcome !== "upheld" && body.outcome !== "dismissed") {
    return NextResponse.json({ error: "outcome is required" }, { status: 400 });
  }

  const result = await resolveComplaint(
    id,
    body.outcome,
    typeof body.note === "string" ? body.note : undefined,
  );
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
