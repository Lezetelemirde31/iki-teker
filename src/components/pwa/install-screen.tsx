"use client";

import { Check, Download, Share, Smartphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";
import type { Messages } from "@/i18n/types";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "android" | "ios" | "desktop";

/**
 * Shareable install page.
 *
 * A progressive web app has no download link — the install *is* the site — so
 * anyone sent the plain URL has no idea to reach for "Add to home screen".
 * This page is the thing you can actually send someone: it detects the
 * platform, offers the one-tap prompt where the browser supports it, and spells
 * out the manual route where it does not (notably iOS, which has no install
 * API at all).
 */
export function InstallScreen({
  locale,
  messages,
}: {
  locale: Locale;
  messages: Messages;
}) {
  const t = createTranslator(messages);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [event, setEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) setPlatform("android");
    else if (/iphone|ipad|ipod/i.test(ua)) setPlatform("ios");

    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);

    const onPrompt = (raw: Event) => {
      raw.preventDefault();
      setEvent(raw as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function install() {
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "accepted") setInstalled(true);
  }

  const guide =
    platform === "ios"
      ? { title: t("install.iosTitle"), body: t("install.iosSteps"), icon: Share }
      : platform === "android"
        ? { title: t("install.androidTitle"), body: t("install.androidSteps"), icon: Smartphone }
        : { title: t("install.desktopTitle"), body: t("install.desktopSteps"), icon: Smartphone };

  const benefits = [
    t("install.benefit1"),
    t("install.benefit2"),
    t("install.benefit3"),
    t("install.benefit4"),
  ];

  return (
    <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
      <div className="flex flex-col items-center px-6 pt-10 pb-8 text-center">
        <span className="bg-primary text-primary-foreground font-display grid size-20 place-items-center rounded-3xl text-2xl font-extrabold">
          IT
        </span>

        <h1 className="font-display mt-6 text-2xl leading-tight font-extrabold text-balance">
          {t("install.pageTitle")}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-[19rem] text-sm leading-relaxed text-pretty">
          {t("install.pageLead")}
        </p>

        {installed ? (
          <div className="mt-7 w-full space-y-3">
            <p className="text-rental flex items-center justify-center gap-2 text-sm font-semibold">
              <Check className="size-4" strokeWidth={3} />
              {t("install.installed")}
            </p>
            <Button size="lg" block asChild className="font-display uppercase">
              <Link href={`/${locale}/home`}>{t("install.openApp")}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-7 w-full space-y-3">
            {/* Only Chromium fires the prompt event; elsewhere the guide below carries it. */}
            {event && (
              <Button size="lg" block onClick={install} className="font-display uppercase">
                <Download />
                {t("install.installNow")}
              </Button>
            )}

            <section className="bg-card border-border rounded-2xl border p-4 text-left">
              <p className="flex items-center gap-2 text-sm font-bold">
                <guide.icon className="size-4" strokeWidth={2.2} />
                {guide.title}
              </p>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{guide.body}</p>
            </section>
          </div>
        )}

        <section className="mt-8 w-full text-left">
          <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
            {t("install.whatYouGet")}
          </h2>
          <ul className="mt-3 space-y-2.5">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2.5 text-sm">
                <span className="bg-rental-soft text-rental mt-0.5 grid size-5 shrink-0 place-items-center rounded-full">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>
        </section>

        <Link
          href={`/${locale}/home`}
          className="text-muted-foreground hover:text-foreground mt-8 text-sm font-semibold transition-colors"
        >
          {t("install.skip")} →
        </Link>

        <div className="mt-8 opacity-40">
          <Logo size="sm" />
        </div>
      </div>
    </main>
  );
}
