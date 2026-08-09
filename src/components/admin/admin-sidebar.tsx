"use client";

import {
  Bike,
  CalendarRange,
  FileWarning,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  Star,
  Tags,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Capability } from "@/server/authorization";
import { cn } from "@/lib/utils";

/**
 * The panel's navigation.
 *
 * Each entry names the capability it needs, and the server passes down which
 * ones the current person holds. Hiding a link is a courtesy, not the guard —
 * every page re-checks on its own — but a sidebar full of things that 404 is a
 * sidebar nobody trusts.
 */

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  needs: Capability;
  badge?: number;
  /**
   * Whether the screen behind it exists yet.
   *
   * The sections still to be built are listed here so the order is settled and
   * visible, but they are not rendered — a sidebar that navigates to a 404 is
   * worse than a shorter sidebar, because it makes every other entry suspect.
   */
  ready?: boolean;
};

export function AdminSidebar({
  capabilities,
  counts,
}: {
  capabilities: Capability[];
  counts: { moderation: number; reports: number; workshops: number };
}) {
  const pathname = usePathname();
  const held = new Set(capabilities);

  const items: Item[] = [
    { href: "/admin", label: "İcmal", icon: LayoutDashboard, needs: "viewPanel", ready: true },
    {
      href: "/admin/moderation",
      label: "Moderasiya",
      icon: ListChecks,
      needs: "moderateContent",
      badge: counts.moderation,
      ready: true,
    },
    {
      href: "/admin/reports",
      label: "Şikayətlər",
      icon: FileWarning,
      needs: "moderateContent",
      badge: counts.reports,
      ready: true,
    },
    { href: "/admin/listings", label: "Elanlar", icon: Bike, needs: "viewPanel" },
    { href: "/admin/users", label: "İstifadəçilər", icon: Users, needs: "viewPanel" },
    {
      href: "/admin/workshops",
      label: "Servislər",
      icon: Wrench,
      needs: "viewPanel",
      badge: counts.workshops,
    },
    { href: "/admin/rentals", label: "İcarə", icon: CalendarRange, needs: "viewPanel" },
    { href: "/admin/reviews", label: "Rəylər", icon: Star, needs: "moderateContent" },
    { href: "/admin/catalog", label: "Marka və model", icon: Tags, needs: "manageCatalog" },
    { href: "/admin/activity", label: "Jurnal", icon: ScrollText, needs: "viewAudit", ready: true },
  ];

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {items
        .filter((item) => item.ready && held.has(item.needs))
        .map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/15 text-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" strokeWidth={2} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-primary text-primary-foreground grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
    </nav>
  );
}
