import "server-only";

import { cookies } from "next/headers";

import { currentUserId as demoUserId } from "@/mocks/users";

import { readSession } from "./auth/session-store";
import { useDatabase } from "./source";

/**
 * Who the request is from.
 *
 * Three sources, in order of authority:
 *
 *   1. A real signed-in session. This is the answer whenever there is one.
 *   2. The demo-identity cookie, which lets one browser act as an owner and
 *      another as a renter without two accounts. It is not a credential and
 *      grants nothing beyond looking a user up.
 *   3. The seeded persona, so every screen still renders with no database and
 *      nobody signed in — which is what the deployed prototype does.
 *
 * `authenticated` is the honest bit: false means "we are showing you something,
 * but nobody proved who they are". Anything that must not be done by a stranger
 * checks it rather than assuming an id implies a person.
 */

const DEMO_COOKIE = "iki-demo-user";

export type Session = {
  userId: string;
  /** True only when a real session backs this request. */
  authenticated: boolean;
};

export async function currentUser(): Promise<Session> {
  if (useDatabase) {
    const session = await readSession();
    if (session) return { userId: session.userId, authenticated: true };
  }

  const jar = await cookies();
  const impersonated = jar.get(DEMO_COOKIE)?.value;

  return {
    userId: impersonated && /^u-[a-z0-9-]+$/.test(impersonated) ? impersonated : demoUserId,
    authenticated: false,
  };
}

/** The id alone, for the many callers that need nothing else. */
export async function currentUserId(): Promise<string> {
  return (await currentUser()).userId;
}

/** True when a real session backs this request. */
export async function isSignedIn(): Promise<boolean> {
  return (await currentUser()).authenticated;
}
