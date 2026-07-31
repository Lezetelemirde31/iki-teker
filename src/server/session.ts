import "server-only";

import { cookies } from "next/headers";

import { currentUserId as demoUserId } from "@/mocks/users";

/**
 * Who the request is from.
 *
 * Real authentication is blocked on a legal entity and an SMS provider, so this
 * resolves to a demo persona for now. It is a function rather than the constant
 * the screens used to import directly, because that is the shape the rest of
 * the code has to be written against either way: asynchronous, per-request, and
 * capable of saying "nobody". When phone sign-in arrives, only the body of
 * `currentUser` changes — no caller does.
 *
 * The cookie exists so a demo can be given a second identity (owner vs renter)
 * without a rebuild. It is not a credential and grants nothing; the value is
 * only ever used to look a user up.
 */

const COOKIE = "iki-demo-user";

export type Session = {
  userId: string;
  /** False once real auth exists and the visitor has not signed in. */
  authenticated: boolean;
};

export async function currentUser(): Promise<Session> {
  const jar = await cookies();
  const impersonated = jar.get(COOKIE)?.value;

  return {
    userId: impersonated && /^u-[a-z0-9-]+$/.test(impersonated) ? impersonated : demoUserId,
    authenticated: true,
  };
}

/** The id alone, for the many callers that need nothing else. */
export async function currentUserId(): Promise<string> {
  return (await currentUser()).userId;
}
