import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

/**
 * Signed-in sessions.
 *
 * Stored server-side rather than packed into a self-contained token. A stateless
 * token cannot be revoked: signing out, or being signed out after a device is
 * lost, would leave a valid credential in the world until it expired on its own.
 * A row can be deleted.
 *
 * The cookie carries only the session id, and the id is 32 random bytes — long
 * enough that guessing one is not a strategy.
 */

export const SESSION_COOKIE = "iki-session";
const TTL_DAYS = 30;

export type ActiveSession = { id: string; userId: string };

function newId(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string, userAgent?: string): Promise<string> {
  const id = newId();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(schema.sessions).values({
    id,
    userId,
    expiresAt,
    userAgent: userAgent?.slice(0, 200) ?? null,
    createdAt: new Date(),
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true, // JavaScript cannot read it, so an XSS bug cannot steal it.
    sameSite: "lax", // Survives a normal link click; blocks cross-site form posts.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return id;
}

/** The session behind the current request, or nothing. */
export async function readSession(): Promise<ActiveSession | undefined> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return undefined;

  const [row] = await db
    .select({ id: schema.sessions.id, userId: schema.sessions.userId })
    .from(schema.sessions)
    // Expiry is checked in the query, not after it: a session that has run out
    // must not come back even for a moment.
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);

  return row;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;

  if (id) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, id));
  }
  jar.delete(SESSION_COOKIE);
}

/** Signs a user out everywhere — for a lost phone, or after a role change. */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
