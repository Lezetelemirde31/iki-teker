import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { currentUserId } from "./session";
import { useDatabase } from "./source";

/**
 * What the current user is allowed to do.
 *
 * Deliberately separate from `session.ts`. That module answers "who is this
 * request from" and belongs to authentication; this one answers "and what may
 * they do", which every protected screen needs whether identity comes from a
 * cookie, a phone OTP or anything else. When real sign-in arrives, nothing here
 * changes.
 *
 * The role is read from the database on each check rather than carried in the
 * session, because revoking a moderator has to take effect immediately — not
 * whenever they next sign in.
 */

export type Role = "user" | "moderator" | "admin";

export async function roleOf(userId: string): Promise<Role> {
  if (!useDatabase) return "user";

  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { role: true },
  });

  return (row?.role as Role) ?? "user";
}

export async function currentRole(): Promise<Role> {
  return roleOf(await currentUserId());
}

/** Moderators and admins both moderate; only admins manage other people. */
export async function canModerate(): Promise<boolean> {
  const role = await currentRole();
  return role === "moderator" || role === "admin";
}

export async function isAdmin(): Promise<boolean> {
  return (await currentRole()) === "admin";
}
