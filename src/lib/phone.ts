/**
 * Azerbaijani phone numbers, normalised.
 *
 * People type the same number a dozen ways: `0501234567`, `050 123 45 67`,
 * `+994 50 123-45-67`, `994501234567`. All of them must resolve to one account,
 * otherwise a user who typed a space last time cannot sign in today. Every
 * number is therefore reduced to a single canonical form before it touches the
 * database.
 *
 * Pure, no I/O — usable on the server for validation and in the browser for
 * instant feedback.
 */

/** Operator prefixes actually issued in Azerbaijan. */
const OPERATORS = ["50", "51", "55", "70", "77", "10", "60", "99"] as const;

/** Canonical form: `+994XXXXXXXXX`. */
export type E164 = string;

export function normalisePhone(input: string): E164 | undefined {
  const digits = input.replace(/\D/g, "");

  // Accepts, in order: 994XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX.
  let national: string | undefined;
  if (digits.length === 12 && digits.startsWith("994")) national = digits.slice(3);
  else if (digits.length === 10 && digits.startsWith("0")) national = digits.slice(1);
  else if (digits.length === 9) national = digits;

  if (!national) return undefined;

  const operator = national.slice(0, 2);
  if (!OPERATORS.includes(operator as (typeof OPERATORS)[number])) return undefined;

  return `+994${national}`;
}

export function isValidPhone(input: string): boolean {
  return normalisePhone(input) !== undefined;
}

/** `+994501234567` → `+994 50 123 45 67`, for display only. */
export function formatPhone(e164: E164): string {
  const national = e164.replace(/^\+994/, "");
  if (national.length !== 9) return e164;
  return `+994 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5, 7)} ${national.slice(7)}`;
}

/**
 * Hides the middle of a number.
 *
 * Used on the code-entry screen so someone can confirm they typed the right
 * number without the full number sitting on a screen in a café.
 */
export function maskPhone(e164: E164): string {
  const national = e164.replace(/^\+994/, "");
  if (national.length !== 9) return e164;
  return `+994 ${national.slice(0, 2)} *** ** ${national.slice(7)}`;
}
