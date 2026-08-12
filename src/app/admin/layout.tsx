import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AdminDrawer } from "@/components/admin/admin-drawer";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getMessages } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/provider";
import { fontVariables } from "@/lib/fonts";
import { openComplaints } from "@/server/complaints";
import { pendingCount } from "@/server/moderation";
import { pendingWorkshopCount } from "@/server/admin";
import { pendingVipCount } from "@/server/promotions";
import { can, currentPrincipal, roleCan, type Capability } from "@/server/authorization";
import { getUser } from "@/server/data";

import "../globals.css";

/**
 * The admin panel's own root.
 *
 * Deliberately outside `/[locale]`. Everything under there is wrapped in a
 * phone frame, because the product is a mobile application and the frame is how
 * it is shown on a laptop without pretending to be a desktop site. The panel is
 * the opposite: a desktop tool for the handful of people running the
 * marketplace, who need wide tables and a sidebar, and who are never customers
 * looking at listings. Sharing that shell would have meant either a cramped
 * panel or a changed app, and the app is not what was asked to change.
 *
 * It follows that nothing under `/[locale]` is touched by anything in here.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Idarəetmə · Iki Tekerli",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // The gate. A single check at the shell means no page below can forget it —
  // and each page still checks its own capability, because a shared layout
  // proves someone may see *a* panel, not that they may see *this* screen.
  if (!(await can("viewPanel"))) notFound();

  const principal = await currentPrincipal();
  const [me, moderation, reports, workshops, vip, messages] = await Promise.all([
    getUser(principal.id),
    pendingCount(),
    openComplaints(),
    pendingWorkshopCount(),
    pendingVipCount(),
    // Shared components — the theme toggle, badges, anything reused from the
    // app — expect a translator. The panel itself is written in Azerbaijani:
    // it is a tool for the people running the marketplace, not a screen its
    // customers ever reach, so there is nothing here to negotiate a locale for.
    getMessages("az"),
  ]);

  const capabilities = (
    [
      "viewPanel",
      "moderateContent",
      "manageUsers",
      "manageCatalog",
      "viewAudit",
      "manageRoles",
    ] as Capability[]
  ).filter((capability) => roleCan(principal.role, capability));

  const roleLabel: Record<string, string> = {
    support: "Dəstək",
    moderator: "Moderator",
    admin: "Admin",
    superadmin: "Baş admin",
  };

  const nav = <AdminSidebar capabilities={capabilities} counts={{ moderation, reports, workshops, vip }} />;
  const whoami = (
    <>
      <p className="truncate text-sm font-semibold">{me?.name ?? principal.id}</p>
      <p className="text-subtle-foreground text-[0.6875rem]">
        {roleLabel[principal.role] ?? principal.role}
      </p>
    </>
  );

  return (
    <html lang="az" className={fontVariables} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <I18nProvider locale="az" messages={messages}>
          <div className="bg-background text-foreground flex min-h-screen">
            <aside className="border-border bg-card sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r md:flex">
              <div className="border-border flex h-14 items-center gap-2 border-b px-4">
                <span className="bg-primary text-primary-foreground font-display grid size-7 place-items-center rounded-lg text-xs font-extrabold">
                  IT
                </span>
                <span className="font-display text-sm font-extrabold">Idarəetmə</span>
              </div>

              <div className="flex-1 overflow-y-auto">{nav}</div>

              <div className="border-border border-t p-3">{whoami}</div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
              {/* Opaque, not translucent. The page scrolls under this bar, and
                  at 80% the heading of whatever section you are in passes
                  visibly through the word above it. A blurred bar is a nice
                  effect on a screen you scroll past; here it just makes two
                  pieces of text sit on top of each other. */}
              <header className="border-border bg-card sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b px-4 md:px-6">
                {/* On a narrow screen the sidebar is gone, so this is both the
                    way between sections and the label saying where you are. */}
                <AdminDrawer footer={whoami}>{nav}</AdminDrawer>
                <span className="font-display text-sm font-extrabold md:hidden">Idarəetmə</span>
                <div className="flex-1" />
                <ThemeToggle />
              </header>

              <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
            </div>
          </div>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
