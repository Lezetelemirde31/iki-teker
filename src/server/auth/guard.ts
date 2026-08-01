import "server-only";

import { redirect } from "next/navigation";

import { currentUser } from "@/server/session";

/**
 * Route protection.
 *
 * Enforced in the page, not in middleware. Middleware runs on the edge without
 * database access, so it could only check that a session cookie is present —
 * and a cookie holding a deleted session id is present too. The check that
 * matters is "does this session still exist", which needs the database.
 *
 * Middleware still handles locale prefixes; it is simply not where
 * authorisation belongs in this app.
 */

export type Guarded = { userId: string };

/**
 * Requires a signed-in user, or sends them to sign in and back again.
 *
 * `next` is preserved so someone who taps "post a listing" lands on the form
 * afterwards rather than on a generic account page wondering what happened.
 */
export async function requireUser(locale: string, next: string): Promise<Guarded> {
  const session = await currentUser();
  if (session.authenticated) return { userId: session.userId };

  redirect(`/${locale}/login?next=${encodeURIComponent(next)}`);
}

/** For screens that adapt rather than redirect. */
export async function optionalUser(): Promise<Guarded | undefined> {
  const session = await currentUser();
  return session.authenticated ? { userId: session.userId } : undefined;
}
