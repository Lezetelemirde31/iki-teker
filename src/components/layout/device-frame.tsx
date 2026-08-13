import type { ReactNode } from "react";

import type { Locale } from "@/i18n/config";

import { InstallPrompt } from "@/components/pwa/install-prompt";

import { DeviceStatusBar } from "./device-status-bar";
import { WebFooter } from "./web-footer";
import { WebHeader } from "./web-header";

/**
 * Presentation shell.
 *
 * One set of pages, two presentations, decided by the width of the screen and
 * nothing else.
 *
 * Below `md` this is the application, unchanged and full-bleed: its own glass
 * header, its own tab bar, its own scrolling pane inside a fixed-height screen.
 * That is what ships to a phone and what the installed app shows, so the
 * product on the store is untouched by anything here.
 *
 * At `md` and above it is a website: a header with the sections and a real
 * search field, the page scrolling as a document, a footer. It used to be the
 * same phone UI centred inside a drawn device frame, which was honest while
 * there was nothing to show a desktop visitor and became wrong the moment the
 * address was something people typed.
 *
 * The classes doing the switching live in `globals.css` under "Device shell".
 */
export async function DeviceFrame({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <div className="device-shell">
      <WebHeader locale={locale} />

      <div className="device-frame">
        <div className="device-island md:hidden" aria-hidden />
        <div className="device-screen">
          <DeviceStatusBar />
          {children}
          {/* Sits below the app's own chrome, as a sibling of the screen content,
              so it never overlaps a sticky footer or the tab bar. */}
          <InstallPrompt />
        </div>
      </div>

      <WebFooter locale={locale} />
    </div>
  );
}
