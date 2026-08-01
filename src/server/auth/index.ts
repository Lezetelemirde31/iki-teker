import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { normalisePhone } from "@/lib/phone";
import type { User } from "@/types";

import { issueCode, verifyCode } from "./codes";
import { createSession, destroySession } from "./session-store";
import { demoAuthAllowed, isDemoAuth, smsSender } from "./sms";

/**
 * Phone sign-in.
 *
 * One flow for both signing in and signing up, because the user does not know
 * or care which one they are doing — they type their number. If an account
 * exists the code signs them in; if it does not, the code creates it. Splitting
 * these into two screens only creates a way to pick the wrong one.
 *
 * The response never reveals whether a number is registered. "This phone is not
 * registered" turns the login form into a tool for checking who is on the
 * platform.
 */

export type StartResult =
  | { ok: true; masked: string; expiresInSeconds: number; devCode?: string }
  | {
      ok: false;
      reason: "invalidPhone" | "nameRequired" | "tooSoon" | "tooMany" | "unavailable";
      retryAfterSeconds?: number;
    };

export type CompleteResult =
  | { ok: true; user: { id: string; name: string }; created: boolean }
  | {
      ok: false;
      reason: "invalidPhone" | "noCode" | "expired" | "tooManyAttempts" | "wrongCode" | "unavailable";
    };

/* -------------------------------------------------------------------------- */
/*  Step one — ask for a code                                                  */
/* -------------------------------------------------------------------------- */

export async function startSignIn(rawPhone: string, name?: string): Promise<StartResult> {
  if (!demoAuthAllowed()) return { ok: false, reason: "unavailable" };

  const phone = normalisePhone(rawPhone);
  if (!phone) return { ok: false, reason: "invalidPhone" };

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.phone, phone),
    columns: { id: true },
  });

  // A new number needs a name, because an account has to be called something.
  // An existing one ignores whatever was typed — a stranger must not be able to
  // rename someone's account by starting a sign-in for their number.
  if (!existing && !name?.trim()) return { ok: false, reason: "nameRequired" };

  const issued = await issueCode(phone, existing ? undefined : name);
  if (!issued.ok) {
    return {
      ok: false,
      reason: issued.reason,
      retryAfterSeconds: issued.retryAfterSeconds,
    };
  }

  await smsSender().send(phone, `Iki Tekerli: ${issued.code}`);

  return {
    ok: true,
    masked: maskFor(phone),
    expiresInSeconds: issued.expiresInSeconds,
    // Returned only when there is no real provider, so the flow can be used at
    // all. `demoAuthAllowed` is what keeps this out of a live deployment.
    devCode: isDemoAuth() ? issued.code : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/*  Step two — prove it                                                        */
/* -------------------------------------------------------------------------- */

export async function completeSignIn(
  rawPhone: string,
  code: string,
): Promise<CompleteResult> {
  if (!demoAuthAllowed()) return { ok: false, reason: "unavailable" };

  const phone = normalisePhone(rawPhone);
  if (!phone) return { ok: false, reason: "invalidPhone" };

  const verified = await verifyCode(phone, code);
  if (!verified.ok) return { ok: false, reason: verified.reason };

  let user = await db.query.users.findFirst({ where: eq(schema.users.phone, phone) });
  let created = false;

  if (!user) {
    const name = verified.pendingName?.trim() || "İstifadəçi";
    const id = `u-${crypto.randomUUID().slice(0, 8)}`;

    await db.insert(schema.users).values({
      id,
      name,
      initials: initialsOf(name),
      avatarTone: "slate",
      kind: "private",
      phone,
      // Verified by definition: they just proved they receive its messages.
      phoneVerified: true,
      verifiedBadge: false,
      rating: "0",
      reviewsCount: 0,
      rentalsCount: 0,
      memberSince: new Date().toISOString().slice(0, 10),
      responseMinutes: 60,
      online: true,
      cityId: "city-baku",
      role: "user",
    });

    user = await db.query.users.findFirst({ where: eq(schema.users.phone, phone) });
    created = true;
  } else if (!user.phoneVerified) {
    // Signing in is proof the number reaches them, so the badge follows.
    await db
      .update(schema.users)
      .set({ phoneVerified: true })
      .where(eq(schema.users.id, user.id));
  }

  if (!user) return { ok: false, reason: "unavailable" };

  const agent = (await headers()).get("user-agent") ?? undefined;
  await createSession(user.id, agent);

  return { ok: true, user: { id: user.id, name: user.name }, created };
}

export async function signOut(): Promise<void> {
  await destroySession();
}

/* -------------------------------------------------------------------------- */

function maskFor(phone: string): string {
  const national = phone.replace(/^\+994/, "");
  return `+994 ${national.slice(0, 2)} *** ** ${national.slice(7)}`;
}

/** "Rəşad Məmmədov" → "RM". Latin and Cyrillic both behave. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export type { User };
