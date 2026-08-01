"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/provider";

/**
 * Signing out.
 *
 * Asks first. Signing out is one tap from a list of settings, and on a phone
 * that list is scrolled past with a thumb — an accidental sign-out means
 * finding your phone, waiting for an SMS and typing six digits to undo it.
 */
export function SignOutButton() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // The identity lives in Server Components, so the tree has to be rebuilt
      // before anything reflects the change.
      router.refresh();
      router.replace(`/${locale}/home`);
    } finally {
      setBusy(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="outline" size="lg" block onClick={() => setConfirming(true)}>
        <LogOut />
        {t("auth.signOut")}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-center text-xs">{t("auth.signOutConfirm")}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="lg" block disabled={busy} onClick={() => setConfirming(false)}>
          {t("common.cancel")}
        </Button>
        <Button variant="danger" size="lg" block disabled={busy} onClick={signOut}>
          <LogOut />
          {t("auth.signOut")}
        </Button>
      </div>
    </div>
  );
}
