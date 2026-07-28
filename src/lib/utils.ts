import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Simulated network latency. Every mock "request" in the prototype goes through
 * this so skeletons and loading states are actually visible during a demo.
 */
export function withDelay<T>(value: T, ms = 320): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Clamp a number into an inclusive range. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Stable pseudo-random in [0,1) from a string seed — keeps mock data deterministic. */
export function seededRandom(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Pick an element deterministically from a list using a string seed. */
export function seededPick<T>(seed: string, items: readonly T[]): T {
  const index = Math.floor(seededRandom(seed) * items.length);
  return items[clamp(index, 0, items.length - 1)] as T;
}
