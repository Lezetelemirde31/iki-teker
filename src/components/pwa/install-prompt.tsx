"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/provider";

/** Chrome's install event, which TypeScript's DOM lib does not model. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISSED_KEY = "iki-install-dismissed";

/**
 * Install banner.
 *
 * Android fires `beforeinstallprompt` only once the manifest, icons and service
 * worker all check out, so this appearing is itself a signal the PWA is
 * correctly configured. It stays out of the way: hidden when already installed,
 * and a dismissal is remembered.
 */
export function InstallPrompt() {
  const t = useT();
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;
    // Already running as an installed app — nothing to offer.
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (raw: Event) => {
      raw.preventDefault();
      setEvent(raw as InstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setVisible(false);
    else dismiss();
  }

  if (!visible || !event) return null;

  return (
    <div className="border-border bg-card safe-bottom z-50 shrink-0 border-t px-4 pt-3 pb-3">
      <div className="flex items-center gap-3">
        <span className="bg-primary text-primary-foreground grid size-10 shrink-0 place-items-center rounded-xl">
          <Download className="size-5" strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{t("install.title")}</p>
          <p className="text-muted-foreground truncate text-xs">{t("install.body")}</p>
        </div>

        <Button size="sm" onClick={install}>
          {t("install.action")}
        </Button>

        <button
          type="button"
          onClick={dismiss}
          aria-label={t("common.close")}
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          <X className="size-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
