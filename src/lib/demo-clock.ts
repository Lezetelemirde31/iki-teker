/**
 * The prototype runs on a fixed clock.
 *
 * Every relative label ("4 min ago", "VIP until July 31"), every availability
 * calendar and every booking window is computed from this instant, so the demo
 * looks identical on every machine and never drifts into showing an empty
 * August calendar. Baku is UTC+4.
 */
export const DEMO_NOW = new Date("2026-07-27T09:41:00+04:00");

export const DEMO_TIMEZONE = "Asia/Baku";

/** `Date` for an offset in days from the demo clock. */
export function demoDate(offsetDays: number): Date {
  const date = new Date(DEMO_NOW);
  date.setDate(date.getDate() + offsetDays);
  return date;
}

/** "2026-08-08" for an offset in days from the demo clock. */
export function demoISODate(offsetDays: number): string {
  return toISODate(demoDate(offsetDays));
}

/** Full timestamp N minutes before the demo clock — for "11 min ago" labels. */
export function minutesAgo(minutes: number): string {
  return new Date(DEMO_NOW.getTime() - minutes * 60_000).toISOString();
}

export function hoursAgo(hours: number): string {
  return minutesAgo(hours * 60);
}

export function daysAgo(days: number): string {
  return minutesAgo(days * 60 * 24);
}

/** Local (not UTC) calendar date, so day boundaries match what the user sees. */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Inclusive list of calendar dates between two ISO dates. */
export function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = parseISODate(start);
  const last = parseISODate(end);
  while (cursor <= last) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Whole days between two ISO dates — the rental billing unit. */
export function daysBetween(start: string, end: string): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}
