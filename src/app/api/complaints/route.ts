import { NextResponse } from "next/server";

import { fileComplaint } from "@/server/complaints";
import { currentUserId } from "@/server/session";

/**
 * Reporting a listing or a person.
 *
 * The request names what is being reported; who owns it and what it is called
 * are read from the database inside the complaints module, so nothing here has
 * to be trusted.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const reporterId = await currentUserId();

  let body: { entityType?: unknown; entityId?: unknown; reason?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { entityType, entityId, reason, note } = body;
  if (
    (entityType !== "listing" && entityType !== "user") ||
    typeof entityId !== "string" ||
    typeof reason !== "string"
  ) {
    return NextResponse.json(
      { error: "entityType, entityId and reason are required" },
      { status: 400 },
    );
  }

  const result = await fileComplaint(
    entityType,
    entityId,
    reporterId,
    reason,
    typeof note === "string" ? note : undefined,
  );
  if (result.ok) return NextResponse.json({ ok: true, id: result.id }, { status: 201 });

  const status =
    result.reason === "notFound" ? 404 : result.reason === "alreadyReported" ? 409 : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
