import { NextResponse } from "next/server";

import { removeSubscription, saveSubscription } from "@/server/notifications";
import { currentUser } from "@/server/session";

/**
 * Registering and removing a device for notifications.
 *
 * Tied to the session, so a subscription always belongs to whoever was signed
 * in when it was made. A body-supplied user id would let anyone redirect
 * someone else's notifications to their own phone.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await currentUser();
  if (!session.authenticated) return NextResponse.json({ error: "notSignedIn" }, { status: 401 });

  let body: { subscription?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const subscription = body.subscription as
    | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    | undefined;

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
    return NextResponse.json({ error: "invalid subscription" }, { status: 422 });
  }

  await saveSubscription(
    session.userId,
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    },
    typeof body.locale === "string" ? body.locale : "az",
    request.headers.get("user-agent") ?? undefined,
  );

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const session = await currentUser();
  if (!session.authenticated) return NextResponse.json({ error: "notSignedIn" }, { status: 401 });

  let endpoint: unknown;
  try {
    ({ endpoint } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof endpoint !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  // Scoped to the session, so one person cannot unsubscribe another's device.
  await removeSubscription(session.userId, endpoint);
  return NextResponse.json({ ok: true });
}
