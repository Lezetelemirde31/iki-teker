"use client";

import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/provider";

/**
 * Sticky action bar on the listing detail screen.
 *
 * Revealing the number is a discrete event, not a passive display: the seller
 * is shown how many times their listing produced a contact, which is what they
 * are actually paying promotion for. The count increments locally here.
 *
 * "Message" opens the conversation about this listing — the same one every
 * time, so a negotiation that pauses and resumes is one thread rather than a
 * pile of empty ones.
 */
export function ContactActions({
  listingId,
  phone,
  contacts,
  threadHref,
}: {
  listingId: string;
  /** Absent when the seller signed up by email and never added one. */
  phone?: string;
  contacts: number;
  threadHref: string;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [opening, setOpening] = useState(false);
  const [total, setTotal] = useState(contacts + 1);

  function reveal() {
    if (revealed) return;
    setRevealed(true);

    // Recorded, not just displayed. This is the number a seller's promotion is
    // sold against, so it has to survive the page being closed.
    fetch(`/api/listings/${listingId}/contact`, { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { contacts?: number | null } | null) => {
        if (typeof data?.contacts === "number") setTotal(data.contacts);
      })
      .catch(() => {
        // The number stays optimistic; the reveal itself already happened.
      });
  }

  async function openConversation() {
    if (opening) return;
    setOpening(true);
    try {
      const response = await fetch("/api/threads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      if (response.ok) {
        const { threadId } = await response.json();
        router.push(`/${locale}/chats/${threadId}`);
        return;
      }
    } catch {
      // Fall through to the inbox.
    }
    // No database, or the seller is you: the inbox is the honest destination.
    router.push(`/${locale}${threadHref}`);
  }

  return (
    <div className="border-border bg-card safe-bottom shrink-0 border-t px-4 pt-3 pb-3">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="lg"
          className="flex-1"
          disabled={opening}
          onClick={openConversation}
        >
          <MessageCircle />
          {t("listing.message")}
        </Button>

        {/* Only when there is a number behind it. Offering to reveal one that
            does not exist wastes the tap that matters most on this screen. */}
        {phone && (
          <Button
            size="lg"
            className="flex-[1.35] font-semibold"
            onClick={reveal}
            aria-live="polite"
          >
            <Phone />
            <span className={revealed ? "tabular" : undefined}>
              {revealed ? phone : t("listing.showPhone")}
            </span>
          </Button>
        )}
      </div>

      {revealed && (
        <p className="text-subtle-foreground mt-2 text-center text-[0.6875rem]">
          {t("listing.contactRevealed")} · {total}
        </p>
      )}
    </div>
  );
}
