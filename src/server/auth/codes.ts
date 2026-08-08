import "server-only";

import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { db } from "@/db/client";
import * as schema from "@/db/schema";


/**
 * One-time codes.
 *
 * Three rules do most of the security work here, and each exists because the
 * obvious implementation is broken:
 *
 *   - The code is **hashed**, never stored. A database dump is then a list of
 *     useless strings rather than a list of live credentials.
 *   - Each code has a **hard attempt limit**. Six digits is a million
 *     possibilities, which sounds safe until someone tries ten thousand a
 *     second; five guesses makes the space irrelevant.
 *   - Requests are **rate limited per destination**. Otherwise the endpoint is
 *     a free way to send someone a hundred messages.
 *
 * A destination is a phone in E.164 or an email address. Nothing here cares
 * which: the rules that matter — hash it, bound the guesses, bound the sends —
 * are the same either way, and the only thing that differs is who carries the
 * message. That lives behind `sms.ts` and `email.ts`.
 */

const CODE_LENGTH = 6;
const TTL_SECONDS = 5 * 60;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_PER_HOUR = 5;

export type IssueResult =
  | { ok: true; code: string; expiresInSeconds: number }
  | { ok: false; reason: "tooSoon" | "tooMany"; retryAfterSeconds?: number };

export type VerifyResult =
  | { ok: true; pendingName: string | null }
  | { ok: false; reason: "noCode" | "expired" | "tooManyAttempts" | "wrongCode" };

/** Six digits, uniformly distributed. `Math.random()` is not good enough here. */
function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/**
 * A plain SHA-256, not a password hash.
 *
 * Password hashes are deliberately slow because passwords are low-entropy and
 * long-lived. This is six random digits that die in five minutes after five
 * guesses, so brute force is already bounded and the slowness would only cost
 * every honest sign-in.
 */
function hash(code: string, destination: string): string {
  return createHash("sha256").update(`${destination}:${code}`).digest("hex");
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // Lengths are equal for two hex digests, but never assume it.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/* -------------------------------------------------------------------------- */

export async function issueCode(destination: string, pendingName?: string): Promise<IssueResult> {
  const now = new Date();

  const recent = await db
    .select({ createdAt: schema.authCodes.createdAt })
    .from(schema.authCodes)
    .where(
      and(
        eq(schema.authCodes.destination, destination),
        gt(schema.authCodes.createdAt, new Date(now.getTime() - 60 * 60 * 1000)),
      ),
    )
    .orderBy(desc(schema.authCodes.createdAt));

  if (recent.length >= MAX_PER_HOUR) {
    return { ok: false, reason: "tooMany" };
  }

  const last = recent[0]?.createdAt;
  if (last) {
    const elapsed = (now.getTime() - last.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        reason: "tooSoon",
        retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed),
      };
    }
  }

  // Any earlier code for this number stops working the moment a new one is
  // issued, so a code read over someone's shoulder yesterday is dead today.
  await db
    .update(schema.authCodes)
    .set({ consumedAt: now })
    .where(and(eq(schema.authCodes.destination, destination), isNull(schema.authCodes.consumedAt)));

  const code = generateCode();
  await db.insert(schema.authCodes).values({
    id: `ac-${crypto.randomUUID().slice(0, 12)}`,
    destination,
    codeHash: hash(code, destination),
    pendingName: pendingName?.trim().slice(0, 80) || null,
    expiresAt: new Date(now.getTime() + TTL_SECONDS * 1000),
    attempts: 0,
    createdAt: now,
  });

  return { ok: true, code, expiresInSeconds: TTL_SECONDS };
}

export async function verifyCode(destination: string, code: string): Promise<VerifyResult> {
  const now = new Date();

  const [row] = await db
    .select()
    .from(schema.authCodes)
    .where(and(eq(schema.authCodes.destination, destination), isNull(schema.authCodes.consumedAt)))
    .orderBy(desc(schema.authCodes.createdAt))
    .limit(1);

  if (!row) return { ok: false, reason: "noCode" };
  if (row.expiresAt <= now) return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "tooManyAttempts" };

  // Counted before the comparison, so a crash mid-check cannot hand out a free
  // guess.
  await db
    .update(schema.authCodes)
    .set({ attempts: sql`${schema.authCodes.attempts} + 1` })
    .where(eq(schema.authCodes.id, row.id));

  if (!equal(row.codeHash, hash(code.trim(), destination))) {
    return { ok: false, reason: "wrongCode" };
  }

  // Single use. Two people holding the same code cannot both sign in.
  await db
    .update(schema.authCodes)
    .set({ consumedAt: now })
    .where(eq(schema.authCodes.id, row.id));

  return { ok: true, pendingName: row.pendingName };
}
