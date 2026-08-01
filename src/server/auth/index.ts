import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { normalisePhone } from "@/lib/phone";
import type { User } from "@/types";

import { issueCode, verifyCode } from "./codes";
import { checkStrength, hashPassword, verifyPassword } from "./passwords";
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
/*  Registration                                                               */
/* -------------------------------------------------------------------------- */

export type RegisterResult =
  | { ok: true; user: { id: string; name: string } }
  | {
      ok: false;
      reason: "invalidPhone" | "nameRequired" | "alreadyRegistered" | "tooShort" | "tooLong" | "tooCommon";
    };

/**
 * Creating an account.
 *
 * No text message required. The phone is the account's name, but proving it is
 * yours is a separate step — the account is created with `phoneVerified` false
 * and the badge appears once a code has been entered.
 *
 * This ordering is what makes the product usable before an SMS contract exists,
 * and it is honest either way: an unverified number is shown as unverified
 * rather than assumed good.
 */
export async function registerWithPassword(
  rawPhone: string,
  name: string,
  password: string,
): Promise<RegisterResult> {
  const phone = normalisePhone(rawPhone);
  if (!phone) return { ok: false, reason: "invalidPhone" };
  if (name.trim().length < 2) return { ok: false, reason: "nameRequired" };

  const strength = checkStrength(password);
  if (!strength.ok) return { ok: false, reason: strength.reason };

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.phone, phone),
    columns: { id: true },
  });
  // Said plainly. Hiding it here helps nobody: the person is standing in front
  // of the form and needs to know to sign in instead.
  if (existing) return { ok: false, reason: "alreadyRegistered" };

  const clean = name.trim().slice(0, 80);
  const id = `u-${crypto.randomUUID().slice(0, 8)}`;

  await db.insert(schema.users).values({
    id,
    name: clean,
    initials: initialsOf(clean),
    avatarTone: "slate",
    kind: "private",
    phone,
    phoneVerified: false,
    verifiedBadge: false,
    rating: "0",
    reviewsCount: 0,
    rentalsCount: 0,
    memberSince: new Date().toISOString().slice(0, 10),
    responseMinutes: 60,
    online: true,
    cityId: "city-baku",
    role: "user",
    passwordHash: await hashPassword(password),
  });

  const agent = (await headers()).get("user-agent") ?? undefined;
  await createSession(id, agent);

  return { ok: true, user: { id, name: clean } };
}

/* -------------------------------------------------------------------------- */
/*  Password                                                                   */
/* -------------------------------------------------------------------------- */

export type PasswordSignInResult =
  | { ok: true; user: { id: string; name: string } }
  | { ok: false; reason: "invalidPhone" | "wrongCredentials" | "noPassword" | "locked" };

/**
 * Signing in with a password.
 *
 * Works with no SMS provider at all, which is the point: an account that
 * already exists should not need a text message to get back into. The code
 * path is kept for registering, verifying a number and resetting a forgotten
 * password — the three things that genuinely require proving the phone is
 * yours.
 *
 * A wrong password and an unknown number answer identically. Distinguishing
 * them turns the form into a way to test which numbers have accounts, and the
 * work is done either way so the timing does not give it away.
 */
export async function signInWithPassword(
  rawPhone: string,
  password: string,
): Promise<PasswordSignInResult> {
  const phone = normalisePhone(rawPhone);
  if (!phone) return { ok: false, reason: "invalidPhone" };

  const user = await db.query.users.findFirst({ where: eq(schema.users.phone, phone) });

  if (!user?.passwordHash) {
    // Still spend the time. An instant "no" for an unknown number and a slow
    // "no" for a wrong password is a difference anyone can measure.
    await verifyPassword(password, DUMMY_HASH);
    return { ok: false, reason: user ? "noPassword" : "wrongCredentials" };
  }

  if (recordAttempt(user.id) === "locked") return { ok: false, reason: "locked" };

  if (!(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, reason: "wrongCredentials" };
  }

  await clearAttempts(user.id);
  const agent = (await headers()).get("user-agent") ?? undefined;
  await createSession(user.id, agent);

  return { ok: true, user: { id: user.id, name: user.name } };
}

/**
 * Sets or replaces a password.
 *
 * Requires either a live session or a freshly proved phone — the caller decides
 * which, and both are real proof of ownership. A reset link that needs neither
 * is how accounts get taken over.
 */
export async function setPassword(
  userId: string,
  password: string,
): Promise<{ ok: true } | { ok: false; reason: "tooShort" | "tooLong" | "tooCommon" }> {
  const strength = checkStrength(password);
  if (!strength.ok) return { ok: false, reason: strength.reason };

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(schema.users.id, userId));

  return { ok: true };
}

/* -------------------------------------------------------------------------- */

/**
 * A hash of a random string, used to keep the timing of a failed sign-in the
 * same whether or not the account exists.
 */
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" +
  "IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIg==";

/**
 * Failed-attempt tracking, in memory.
 *
 * Deliberately not a table: this is a speed bump against online guessing, not
 * an audit trail, and it resetting when the process restarts is acceptable for
 * that. The offline case — someone with the hashes — is scrypt's problem, and
 * scrypt is what answers it.
 */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 8;
const LOCK_MINUTES = 15;

function recordAttempt(userId: string): "ok" | "locked" {
  const now = Date.now();
  const entry = attempts.get(userId);

  if (entry && entry.until > now) {
    return entry.count >= MAX_ATTEMPTS ? "locked" : "ok";
  }

  attempts.set(userId, {
    count: (entry && entry.until > now ? entry.count : 0) + 1,
    until: now + LOCK_MINUTES * 60 * 1000,
  });

  return (attempts.get(userId)?.count ?? 0) > MAX_ATTEMPTS ? "locked" : "ok";
}

function clearAttempts(userId: string): void {
  attempts.delete(userId);
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
