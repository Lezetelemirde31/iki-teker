import "server-only";

import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/**
 * `promisify` drops the overload that takes options, so the wrapper is written
 * out rather than inferred.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derived) =>
      error ? reject(error) : resolve(derived),
    );
  });
}

/**
 * Passwords.
 *
 * Hashed with scrypt, which is in Node's standard library — no dependency, and
 * memory-hard rather than merely slow, so a GPU farm gains far less on it than
 * on an iterated SHA. The parameters below cost roughly 100ms per hash on a
 * normal server: unnoticeable when signing in, ruinous when guessing.
 *
 * The stored value carries everything needed to check it and nothing needed to
 * reverse it: `scrypt$N$r$p$salt$hash`. Keeping the parameters in the record
 * means they can be raised later without invalidating anyone's password —
 * old hashes still verify with the settings they were made under.
 */

const N = 16384; // CPU/memory cost
const R = 8; // block size
const P = 1; // parallelism
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 200;

export type StrengthResult = { ok: true } | { ok: false; reason: "tooShort" | "tooLong" | "tooCommon" };

/**
 * The passwords that get tried first.
 *
 * A short list of the ones that actually appear in every breach dump, plus the
 * local-language equivalents a rule about "8 characters" would happily accept.
 * Length alone does not stop `12345678`.
 */
const COMMON = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "qwertyui",
  "qwerty123",
  "11111111",
  "00000000",
  "iloveyou",
  "admin123",
  "azerbaijan",
  "azerbaycan",
  "baku2024",
  "baki2024",
  "parol123",
  "motosiklet",
]);

export function checkStrength(password: string): StrengthResult {
  if (password.length < MIN_LENGTH) return { ok: false, reason: "tooShort" };
  if (password.length > MAX_LENGTH) return { ok: false, reason: "tooLong" };
  if (COMMON.has(password.toLowerCase())) return { ok: false, reason: "tooCommon" };
  return { ok: true };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { N, r: R, p: P });

  return ["scrypt", N, R, P, salt.toString("base64"), derived.toString("base64")].join("$");
}

/**
 * Checks a password against a stored hash.
 *
 * Returns false for a malformed record rather than throwing: a corrupt row
 * should refuse the sign-in, not take the endpoint down.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64 ?? "", "base64");
  const expected = Buffer.from(hashB64 ?? "", "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });

  // Constant time: a fast "wrong" and a slow "wrong" leak how much was right.
  return timingSafeEqual(derived, expected);
}
