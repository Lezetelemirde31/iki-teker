import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { currentUser } from "./session";
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
 * whenever they next sign in. The account's status is read in the same query,
 * because a banned admin is still an admin by role and must still be stopped.
 */

export type Role = "user" | "support" | "moderator" | "admin" | "superadmin";
export type AccountStatus = "active" | "suspended" | "banned";

/**
 * Every distinct thing the panel can do.
 *
 * Named for the action rather than the screen, so moving a button to a
 * different page cannot quietly change who may press it.
 */
export type Capability =
  /** Read the panel at all — dashboard, lists, detail views. */
  | "viewPanel"
  /** Decide on listings and workshops, resolve reports. */
  | "moderateContent"
  /** Ban, suspend or reinstate an account; verify a seller. */
  | "manageUsers"
  /** Edit makes and models, set VIP, edit a listing's details. */
  | "manageCatalog"
  /** Read the audit log. */
  | "viewAudit"
  /** Grant and revoke roles. */
  | "manageRoles";

/**
 * Who may do what.
 *
 * A table rather than a chain of `role === "x" || role === "y"` checks, because
 * the question "who can ban somebody" should have one answer in one place that
 * can be read at a glance and tested directly.
 *
 * The ordering is cumulative by intent: support answers people and can see the
 * panel, a moderator decides on content, an admin acts on accounts and the
 * catalogue, and only a superadmin hands out roles — the one power that must
 * not be self-service, or the first account to be compromised becomes every
 * account.
 */
const CAPABILITIES: Record<Role, readonly Capability[]> = {
  user: [],
  support: ["viewPanel"],
  moderator: ["viewPanel", "moderateContent"],
  admin: ["viewPanel", "moderateContent", "manageUsers", "manageCatalog", "viewAudit"],
  superadmin: [
    "viewPanel",
    "moderateContent",
    "manageUsers",
    "manageCatalog",
    "viewAudit",
    "manageRoles",
  ],
};

export type Principal = { id: string; role: Role; status: AccountStatus };

export async function principalOf(userId: string): Promise<Principal> {
  if (!useDatabase) return { id: userId, role: "user", status: "active" };

  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { role: true, status: true },
  });

  return {
    id: userId,
    role: (row?.role as Role) ?? "user",
    status: (row?.status as AccountStatus) ?? "active",
  };
}

export async function roleOf(userId: string): Promise<Role> {
  return (await principalOf(userId)).role;
}

/**
 * The principal, and whether anybody actually proved they are it.
 *
 * `session.currentUser` answers with an id even when nobody has signed in — the
 * demo-identity cookie lets one browser act as an owner and another as a renter
 * while the product is being shown. That cookie is not a credential: anyone can
 * set it to anything. Which is fine for looking at a catalogue and completely
 * unacceptable for anything behind the panel, so the fact is carried here
 * rather than dropped.
 */
export async function currentPrincipal(): Promise<Principal & { authenticated: boolean }> {
  const session = await currentUser();
  return { ...(await principalOf(session.userId)), authenticated: session.authenticated };
}

export async function currentRole(): Promise<Role> {
  return (await currentPrincipal()).role;
}

/**
 * The single gate.
 *
 * Three conditions, and all of them have to hold.
 *
 * Signed in for real, first. The demo-identity cookie names a user without
 * proving anything, so honouring it here would mean anybody who typed a
 * privileged id into their own browser held that person's powers. Every screen
 * and every write behind the panel goes through this function, so refusing
 * unauthenticated callers once refuses them everywhere.
 *
 * Then the account's status, because a suspended or banned account holds no
 * capability whatever its role says — stopping someone has to stop them, not
 * demote them.
 *
 * Then the role.
 */
export async function can(capability: Capability): Promise<boolean> {
  const principal = await currentPrincipal();
  if (!principal.authenticated) return false;
  if (principal.status !== "active") return false;
  return CAPABILITIES[principal.role].includes(capability);
}

/** Whether a given role holds a capability — for rendering, and for tests. */
export function roleCan(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}

/* -------------------------------------------------------------------------- */
/*  The names the rest of the app already uses                                 */
/* -------------------------------------------------------------------------- */

/** Moderators and above decide on content. */
export async function canModerate(): Promise<boolean> {
  return can("moderateContent");
}

export async function isAdmin(): Promise<boolean> {
  return can("manageUsers");
}
