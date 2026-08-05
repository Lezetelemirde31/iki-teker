"use client";

import { cn } from "@/lib/utils";

/**
 * The phone input.
 *
 * `+994` is printed, not typed. Everyone entering a number here is in
 * Azerbaijan, so asking them to type a country code is asking them to get it
 * wrong — with a leading zero, without one, with a `+`, without. The field
 * holds nine digits and nothing else, and groups them as they arrive so a
 * mistyped digit is visible rather than buried in a run of numbers.
 */
export function PhoneField({
  value,
  onChange,
  onBlur,
  invalid,
  label,
}: {
  /** National part only — nine digits, no country code. */
  value: string;
  onChange: (digits: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "bg-card border-border focus-within:border-primary flex h-12 w-full items-center rounded-xl border transition-colors",
        invalid && "border-destructive",
      )}
    >
      <span className="text-muted-foreground tabular border-border shrink-0 border-r px-3 text-sm">
        +994
      </span>
      <input
        value={group(value)}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 9))}
        onBlur={onBlur}
        inputMode="numeric"
        autoComplete="tel-national"
        aria-label={label}
        placeholder="50 123 45 67"
        className="tabular min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
      />
    </span>
  );
}

/** `501234567` → `50 123 45 67`, the way the number is read aloud. */
function group(digits: string): string {
  const parts = [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)];
  return parts.filter(Boolean).join(" ");
}
