import { NextResponse } from "next/server";

import { setUserRole, setUserStatus, setUserVerified } from "@/server/admin";

/**
 * Acting on an account.
 *
 * Three different powers behind one route, and each re-checks its own
 * permission inside the server module — banning needs `manageUsers`, changing
 * a role needs `manageRoles`, and neither can be reached by calling the other.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let payload: { status?: unknown; role?: unknown; verified?: unknown; note?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const note = typeof payload.note === "string" ? payload.note : undefined;

  const result =
    typeof payload.status === "string"
      ? await setUserStatus(id, payload.status, note)
      : typeof payload.role === "string"
        ? await setUserRole(id, payload.role)
        : typeof payload.verified === "boolean"
          ? await setUserVerified(id, payload.verified)
          : null;

  if (!result) {
    return NextResponse.json({ error: "status, role or verified is required" }, { status: 400 });
  }
  if (result.ok) return NextResponse.json({ ok: true });

  const status =
    result.reason === "notAllowed"
      ? 403
      : result.reason === "notFound"
        ? 404
        : result.reason === "self" || result.reason === "lastSuperadmin"
          ? 409
          : 422;
  return NextResponse.json({ error: result.reason }, { status });
}
