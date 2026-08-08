import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { normalisePhone } from "@/lib/phone";
import type { User } from "@/types";

import { discardCode, issueCode, verifyCode } from "./codes";
import { checkStrength, hashPassword, verifyPassword } from "./passwords";
import { createSession, destroySession } from "./session-store";
import { emailSender, isDemoEmail, normaliseEmail } from "./email";
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
  | {
      ok: false;
      reason: "invalidPhone" | "noAccount" | "wrongCredentials" | "noPassword" | "locked";
    };

/**
 * Signing in with a password.
 *
 * Works with no SMS provider at all, which is the point: an account that
 * already exists should not need a text message to get back into. The code
 * path is kept for registering, verifying a number and resetting a forgotten
 * password — the three things that genuinely require proving the phone is
 * yours.
 *
 * An unknown number is told so, rather than being handed "wrong password" for a
 * password it never had. Hiding the difference is the textbook advice and it is
 * wrong here: it leaves someone who has never registered staring at an error
 * that says they typed something incorrectly, with no way forward. The client
 * turns this into "you have not registered yet" and takes them there.
 *
 * The enumeration this gives up was already gone — registration answers
 * `alreadyRegistered`, and sellers publish their numbers on their own listings.
 * A wrong password on a real account still says only that, and still costs the
 * same time as a right one.
 */
export async function signInWithPassword(
  rawPhone: string,
  password: string,
): Promise<PasswordSignInResult> {
  const phone = normalisePhone(rawPhone);
  if (!phone) return { ok: false, reason: "invalidPhone" };

  const user = await db.query.users.findFirst({ where: eq(schema.users.phone, phone) });

  if (!user?.passwordHash) {
    // Still spend the time, so the shape of the answer is the only thing that
    // differs — not how long it took to produce.
    await verifyPassword(password, DUMMY_HASH);
    return { ok: false, reason: user ? "noPassword" : "noAccount" };
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
/*  The same two steps, by email                                               */
/* -------------------------------------------------------------------------- */

/**
 * Signing in with an address instead of a number.
 *
 * Identical in shape to the phone flow above and deliberately so — same codes,
 * same attempt limits, same rate limiting, same refusal to say whether an
 * account exists. A destination is a destination; only the carrier differs.
 *
 * It exists because SMS is blocked on a legal entity that does not exist yet,
 * and an email provider is not. This is what people can actually sign in with
 * today.
 */
export type EmailStartResult =
  | { ok: true; masked: string; expiresInSeconds: number; devCode?: string }
  | {
      ok: false;
      reason: "invalidEmail" | "nameRequired" | "tooSoon" | "tooMany" | "undeliverable";
      retryAfterSeconds?: number;
    };

export type EmailCompleteResult =
  | { ok: true; user: { id: string; name: string }; created: boolean }
  | {
      ok: false;
      reason: "invalidEmail" | "noCode" | "expired" | "tooManyAttempts" | "wrongCode" | "unavailable";
    };

export async function startEmailSignIn(
  rawEmail: string,
  name?: string,
): Promise<EmailStartResult> {
  const email = normaliseEmail(rawEmail);
  if (!email) return { ok: false, reason: "invalidEmail" };

  // Demo mode hands the code back to whoever asked, so it is refused in
  // production for the same reason the SMS one is.
  if (isDemoEmail() && process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_AUTH !== "1") {
    return { ok: false, reason: "undeliverable" };
  }

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
    columns: { id: true },
  });

  if (!existing && !name?.trim()) return { ok: false, reason: "nameRequired" };

  const issued = await issueCode(email, existing ? undefined : name);
  if (!issued.ok) {
    return { ok: false, reason: issued.reason, retryAfterSeconds: issued.retryAfterSeconds };
  }

  const sent = await emailSender().send(
    email,
    `Iki Tekerli — giriş kodu: ${issued.code}`,
    `Giriş kodunuz: ${issued.code}\n\nKod 5 dəqiqə keçərlidir. Bu girişi siz istəməmisinizsə, bu məktubu nəzərə almayın.`,
  );

  // Saying "sent" when nothing was sent leaves someone waiting for a code that
  // is never coming, and blaming their inbox.
  if (!sent.sent) {
    // The row that was just written is what the rate limiter counts, so leaving
    // it there would lock them out for a minute over a failure that was not
    // theirs. The provider's own words go to the server log, because the reason
    // a message was refused — an unverified sending domain, a rejected key — is
    // something only whoever configured it can act on, and it must not be
    // handed to whoever typed the address.
    await discardCode(email);
    console.error(`[email] could not send to ${maskEmail(email)}: ${sent.reason}`);
    return { ok: false, reason: "undeliverable" };
  }

  return {
    ok: true,
    masked: maskEmail(email),
    expiresInSeconds: issued.expiresInSeconds,
    devCode: isDemoEmail() ? issued.code : undefined,
  };
}

export async function completeEmailSignIn(
  rawEmail: string,
  code: string,
): Promise<EmailCompleteResult> {
  const email = normaliseEmail(rawEmail);
  if (!email) return { ok: false, reason: "invalidEmail" };

  const verified = await verifyCode(email, code);
  if (!verified.ok) return { ok: false, reason: verified.reason };

  let user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
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
      // No phone. That is the whole point of this route, and why the column
      // stopped being required.
      email,
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
    });

    user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
    created = true;
  }

  if (!user) return { ok: false, reason: "unavailable" };

  const agent = (await headers()).get("user-agent") ?? undefined;
  await createSession(user.id, agent);

  return { ok: true, user: { id: user.id, name: user.name }, created };
}

/* -------------------------------------------------------------------------- */

function maskFor(phone: string): string {
  const national = phone.replace(/^\+994/, "");
  return `+994 ${national.slice(0, 2)} *** ** ${national.slice(7)}`;
}

/** `abdullah@gmail.com` → `ab****@gmail.com`. Enough to recognise, not to learn. */
function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(2, local.length - 2))}@${domain}`;
}

/** "Rəşad Məmmədov" → "RM". Latin and Cyrillic both behave. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

export type { User };
