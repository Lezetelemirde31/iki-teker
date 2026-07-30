import type { ReactNode } from "react";

import { getMessages } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/translate";

import { InstallPrompt } from "@/components/pwa/install-prompt";

import { DeviceStatusBar } from "./device-status-bar";

/**
 * Presentation shell.
 *
 * Iki Tekerli is designed as a native mobile application, so there is deliberately
 * no desktop layout. Below ~528px the app is full-bleed — exactly what ships to
 * a phone. Above it, the identical UI is centred inside a device frame so the
 * product can be demoed on a laptop without pretending to be a desktop website.
 *
 * The frame is chrome only: it renders a status bar and island that a real
 * phone's OS would draw, and nothing inside `children` is aware of it.
 */
export async function DeviceFrame({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const t = createTranslator(await getMessages(locale));

  return (
    <div className="device-shell">
      <div className="device-frame">
        <div className="device-island" aria-hidden />
        <div className="device-screen">
          <DeviceStatusBar />
          {children}
          {/* Sits below the app's own chrome, as a sibling of the screen content,
              so it never overlaps a sticky footer or the tab bar. */}
          <InstallPrompt />
        </div>
      </div>

      <p className="device-caption text-subtle-foreground hidden items-center gap-2 text-xs">
        <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tracking-wide uppercase">
          {t("preview.badge")}
        </span>
        {t("preview.hint")}
      </p>
    </div>
  );
}
