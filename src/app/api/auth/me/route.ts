import { NextResponse } from "next/server";

import { getUser } from "@/server/data";
import { currentUser } from "@/server/session";

/**
 * Who the browser is currently signed in as.
 *
 * Used by the client provider after sign-in and sign-out, so the header does
 * not have to wait for a full navigation to catch up.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await currentUser();
  if (!session.authenticated) return NextResponse.json({ user: null });

  const user = await getUser(session.userId);
  if (!user) return NextResponse.json({ user: null });

  // Both identities, because an account now has one or the other and a screen
  // that only ever asks for the phone shows a blank for everybody who signed
  // up with an address.
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      initials: user.initials,
      phone: user.phone ?? null,
      email: user.email ?? null,
    },
  });
}
