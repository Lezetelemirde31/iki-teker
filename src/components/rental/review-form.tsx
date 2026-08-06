"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

/**
 * Rating the other side of a finished rental.
 *
 * Opens where the rental already is, on the account screen, rather than behind
 * a notification. The moment somebody is most willing to write a review is the
 * moment they are looking at the thing they are reviewing.
 *
 * Stars first, words second, and the words are required. A bare five with no
 * sentence tells the next renter nothing, and a bare one tells them even less.
 */
export function ReviewForm({ bookingId, otherName }: { bookingId: string; otherName: string }) {
  const t = useT();
  const router = useRouter();

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const ready = rating > 0 && text.trim().length >= 10;

  async function submit() {
    if (!ready || sending) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId, rating, text }),
      });

      if (response.ok) {
        setDone(true);
        // The profile's average changes the moment this lands, so the screen
        // behind it is now out of date.
        router.refresh();
        return;
      }

      const data = await response.json().catch(() => null);
      const key = `review.error.${data?.error}` as Parameters<typeof t>[0];
      const message = t(key);
      setError(message === key ? t("review.error.generic") : message);
    } catch {
      setError(t("review.error.generic"));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <p className="bg-rental/10 text-rental-foreground rounded-lg px-3 py-2 text-xs">
        {t("review.done")}
      </p>
    );
  }

  return (
    <div className="border-border space-y-2.5 rounded-xl border p-3">
      <p className="text-xs font-semibold">
        {t("review.ratePrompt")} <span className="text-muted-foreground">{otherName}</span>
      </p>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={t("review.stars", { n: value })}
            aria-pressed={rating === value}
            className="p-0.5 transition-transform active:scale-90"
          >
            <Star
              className={cn(
                "size-6",
                value <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
              )}
              strokeWidth={1.8}
            />
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("review.placeholder")}
        rows={3}
        className="bg-surface-2 border-border placeholder:text-subtle-foreground w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
      />

      {error && (
        <p role="alert" className="text-destructive text-[0.6875rem]">
          {error}
        </p>
      )}

      <Button size="sm" disabled={!ready || sending} onClick={submit} className="w-full">
        {t("review.submit")}
      </Button>
    </div>
  );
}
