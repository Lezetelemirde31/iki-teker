import { NextResponse } from "next/server";

import { updateProfile } from "@/server/profile";
import { currentUser } from "@/server/session";

/**
 * Editing your own account, and only your own.
 *
 * The user id comes from the session, never from the body. A profile endpoint
 * that accepts an id is an endpoint for editing other people's profiles.
 */
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const session = await currentUser();
  if (!session.authenticated) return NextResponse.json({ error: "notSignedIn" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const text = (value: unknown) => (typeof value === "string" ? value : undefined);

  const result = await updateProfile(session.userId, {
    name: text(body.name) ?? "",
    cityId: text(body.cityId) ?? "",
    districtId: text(body.districtId),
    email: text(body.email),
    bio: text(body.bio),
  });

  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json(
    { error: result.reason, field: result.field },
    { status: result.reason === "notFound" ? 404 : 422 },
  );
}
