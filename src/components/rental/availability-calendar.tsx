"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { useLocale, useT } from "@/i18n/provider";
import { localeMeta } from "@/i18n/config";
import { toISODate } from "@/lib/demo-clock";
import { cn } from "@/lib/utils";

export type Range = { start?: string; end?: string };

/**
 * Availability calendar.
 *
 * Blocked days are not selectable, and a range that would span one is rejected
 * outright — the client-side mirror of the database constraint that makes
 * double-booking impossible. Weeks start on Monday, as they do in Azerbaijan.
 */
export function AvailabilityCalendar({
  blockedDates,
  minDate,
  value,
  onChange,
  months = 3,
}: {
  blockedDates: string[];
  /** Nothing before this date can be picked — usually the demo's "today". */
  minDate: string;
  value: Range;
  onChange: (range: Range) => void;
  months?: number;
}) {
  const locale = useLocale();
  const t = useT();
  const blocked = useMemo(() => new Set(blockedDates), [blockedDates]);

  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date(`${minDate}T00:00:00`);
  const cursor = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);

  const monthLabel = new Intl.DateTimeFormat(localeMeta[locale].dateLocale, {
    month: "long",
    year: "numeric",
  }).format(cursor);

  // Monday-first weekday initials, taken from the locale rather than hardcoded.
  const weekdays = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeMeta[locale].dateLocale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(2026, 5, 1 + index); // 1 June 2026 is a Monday
      return formatter.format(day);
    });
  }, [locale]);

  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leading = (firstOfMonth.getDay() + 6) % 7; // shift Sunday=0 to Monday=0

  function rangeHasBlocked(start: string, end: string) {
    const cur = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);
    while (cur <= last) {
      if (blocked.has(toISODate(cur))) return true;
      cur.setDate(cur.getDate() + 1);
    }
    return false;
  }

  function select(iso: string) {
    const { start, end } = value;

    // Starting fresh, or restarting because the tap is before the current start.
    if (!start || end || iso < start) {
      onChange({ start: iso, end: undefined });
      return;
    }
    if (iso === start) {
      onChange({ start: undefined, end: undefined });
      return;
    }
    if (rangeHasBlocked(start, iso)) {
      // Treat it as the start of a new range rather than silently failing.
      onChange({ start: iso, end: undefined });
      return;
    }
    onChange({ start, end: iso });
  }

  return (
    <div className="bg-card border-border rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthOffset((value) => Math.max(0, value - 1))}
          disabled={monthOffset === 0}
          aria-label={t("common.back")}
          className="text-muted-foreground hover:bg-muted disabled:opacity-30 grid size-8 place-items-center rounded-full transition-colors"
        >
          <ChevronLeft className="size-4.5" strokeWidth={2.4} />
        </button>
        <p className="font-display text-sm font-extrabold capitalize">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setMonthOffset((value) => Math.min(months - 1, value + 1))}
          disabled={monthOffset === months - 1}
          aria-label={t("common.next")}
          className="text-muted-foreground hover:bg-muted disabled:opacity-30 grid size-8 place-items-center rounded-full transition-colors"
        >
          <ChevronRight className="size-4.5" strokeWidth={2.4} />
        </button>
      </div>

      <div className="text-subtle-foreground mb-1 grid grid-cols-7 gap-0.5 text-center text-[0.625rem] font-semibold">
        {weekdays.map((day) => (
          <span key={day} className="py-1 uppercase">
            {day.slice(0, 2)}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: leading }, (_, index) => (
          <span key={`pad-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const iso = toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), day));
          const isBlocked = blocked.has(iso) || iso < minDate;
          const isStart = iso === value.start;
          const isEnd = iso === value.end;
          const inRange =
            value.start && value.end ? iso > value.start && iso < value.end : false;

          return (
            <button
              key={iso}
              type="button"
              disabled={isBlocked}
              onClick={() => select(iso)}
              aria-label={iso}
              aria-pressed={isStart || isEnd}
              className={cn(
                "tabular relative grid aspect-square place-items-center rounded-lg text-sm font-semibold transition-colors",
                isBlocked && "text-subtle-foreground/50 line-through",
                !isBlocked && !isStart && !isEnd && !inRange && "hover:bg-muted",
                inRange && "bg-primary-soft text-foreground rounded-none",
                (isStart || isEnd) && "bg-primary text-primary-foreground",
                isStart && value.end && "rounded-r-none",
                isEnd && "rounded-l-none",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="text-subtle-foreground mt-3 flex items-center gap-4 text-[0.6875rem]">
        <span className="flex items-center gap-1.5">
          <span className="bg-primary size-2.5 rounded-sm" />
          {t("calendar.selected")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-muted-foreground/40 size-2.5 rounded-sm" />
          {t("calendar.booked")}
        </span>
      </div>
    </div>
  );
}
