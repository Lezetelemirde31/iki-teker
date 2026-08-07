"use client";

import { Flag } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useT } from "@/i18n/provider";

/**
 * Reporting a listing or a person.
 *
 * Deliberately quiet — a small text link under the content, not a button
 * competing with "message the seller". The people who need it go looking for
 * it; putting it in the way would invite reports as a way of complaining about
 * a price.
 *
 * Closed once it has been sent. One account gets one report per thing, so an
 * inviting second attempt would only ever produce an error.
 */
const reasonsFor = {
  listing: ["fraud", "sold", "wrongCategory", "offensive", "spam", "other"],
  user: ["fraud", "offensive", "spam", "other"],
} as const;

export function ReportButton({
  entityType,
  entityId,
}: {
  entityType: "listing" | "user";
  entityId: string;
}) {
  const t = useT();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason || sending) return;
    setSending(true);
    setError(null);

    try {
      const response = await fetch("/api/complaints", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entityType, entityId, reason, note }),
      });

      if (response.ok) {
        setDone(true);
        return;
      }

      const data = await response.json().catch(() => null);
      const key = `report.error.${data?.error}` as Parameters<typeof t>[0];
      const message = t(key);
      setError(message === key ? t("report.error.generic") : message);
    } catch {
      setError(t("report.error.generic"));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <p className="text-muted-foreground flex items-center gap-1.5 px-1 py-2 text-xs">
        <Flag className="size-3.5" />
        {t("report.done")}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-subtle-foreground hover:text-muted-foreground flex items-center gap-1.5 px-1 py-2 text-xs transition-colors"
      >
        <Flag className="size-3.5" />
        {t("report.action")}
      </button>
    );
  }

  return (
    <div className="border-border space-y-2.5 rounded-xl border p-3">
      <p className="text-xs font-semibold">{t("report.title")}</p>

      <div className="flex flex-wrap gap-1.5">
        {reasonsFor[entityType].map((value) => (
          <Chip key={value} onClick={() => setReason(value)} selected={reason === value}>
            {t(`report.reasons.${value}` as Parameters<typeof t>[0])}
          </Chip>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t("report.placeholder")}
        rows={2}
        maxLength={500}
        className="bg-surface-2 border-border placeholder:text-subtle-foreground w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none"
      />

      {error && (
        <p role="alert" className="text-destructive text-[0.6875rem]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button size="sm" block disabled={!reason || sending} onClick={submit}>
          {t("report.submit")}
        </Button>
        <Button size="sm" variant="ghost" block onClick={() => setOpen(false)} disabled={sending}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
