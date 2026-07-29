"use client";

import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/provider";

/**
 * Sticky action bar on the listing detail screen.
 *
 * Revealing the number is a discrete event, not a passive display: the seller
 * is shown how many times their listing produced a contact, which is what they
 * are actually paying promotion for. The count increments locally here.
 */
export function ContactActions({
  phone,
  contacts,
  threadHref,
}: {
  phone: string;
  contacts: number;
  threadHref: string;
}) {
  const t = useT();
  const locale = useLocale();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="border-border bg-card safe-bottom shrink-0 border-t px-4 pt-3 pb-3">
      <div className="flex gap-2">
        <Button variant="outline" size="lg" className="flex-1" asChild>
          <Link href={`/${locale}${threadHref}`}>
            <MessageCircle />
            {t("listing.message")}
          </Link>
        </Button>

        <Button
          size="lg"
          className="flex-[1.35] font-semibold"
          onClick={() => setRevealed(true)}
          aria-live="polite"
        >
          <Phone />
          <span className={revealed ? "tabular" : undefined}>
            {revealed ? phone : t("listing.showPhone")}
          </span>
        </Button>
      </div>

      {revealed && (
        <p className="text-subtle-foreground mt-2 text-center text-[0.6875rem]">
          {t("listing.contactRevealed")} · {contacts + 1}
        </p>
      )}
    </div>
  );
}
