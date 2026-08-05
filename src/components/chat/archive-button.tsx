"use client";

import { Archive, ArchiveRestore, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLocale, useT } from "@/i18n/provider";

/**
 * Putting a finished conversation away.
 *
 * Lives in the thread header as an icon, not a labelled button in the message
 * area — it is a filing action, used once when a deal is done, and it should
 * not sit in the way of the thing people came here to do.
 *
 * No confirmation. Nothing is destroyed, the other side keeps their copy, and
 * un-archiving is one tap from the inbox — a dialogue would cost every user
 * something to protect against a mistake that undoes itself.
 */
export function ArchiveButton({
  threadId,
  archived,
}: {
  threadId: string;
  archived: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [isArchived, setIsArchived] = useState(archived);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !isArchived;

    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived: next }),
      });
      if (!response.ok) return;

      setIsArchived(next);
      // Archiving means this thread no longer belongs on the screen the user is
      // looking at, so send them back to the inbox it left.
      if (next) {
        router.replace(`/${locale}/chats`);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={isArchived ? t("chat.unarchive") : t("chat.archive")}
      className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-9 place-items-center rounded-full transition-colors active:scale-90 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="size-5 animate-spin" />
      ) : isArchived ? (
        <ArchiveRestore className="size-5" strokeWidth={2} />
      ) : (
        <Archive className="size-5" strokeWidth={2} />
      )}
    </button>
  );
}
