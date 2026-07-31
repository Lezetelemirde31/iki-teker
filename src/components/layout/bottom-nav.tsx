"use client";

import { House, MessageCircle, Plus, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { CategoryIcon } from "@/components/common/category-icon";
import { Sheet } from "@/components/ui/sheet";
import { useLocale, useT } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/types";
import { cn } from "@/lib/utils";
import type { CategorySlug } from "@/types";

const tabs = [
  { href: "/home", icon: House, labelKey: "nav.home" },
  { href: "/search", icon: Search, labelKey: "nav.search" },
  { href: "/chats", icon: MessageCircle, labelKey: "nav.chats" },
  { href: "/account", icon: User, labelKey: "nav.account" },
] as const;

/**
 * Only the vehicle categories lead anywhere yet — parts and gear need a
 * different set of fields (part number, compatibility, sizes) and are a
 * separate build. Listing them here with nothing behind them would be worse
 * than leaving them out.
 */
const postOptions: { slug: CategorySlug; labelKey: MessageKey }[] = [
  { slug: "motorcycles", labelKey: "categories.motorcycles" },
  { slug: "scooters", labelKey: "categories.scooters" },
  { slug: "electric", labelKey: "categories.electric" },
  { slug: "bicycles", labelKey: "categories.bicycles" },
];

/**
 * Persistent tab bar, five destinations with the post action raised in the
 * middle — the arrangement from the source prototype. It is a flex child of the
 * app shell rather than `position: fixed`, so it behaves the same on a phone
 * and inside the desktop device frame.
 */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const t = useT();
  const [postOpen, setPostOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(`/${locale}${href}`);
  const [first, second] = [tabs[0], tabs[1]];
  const [third, fourth] = [tabs[2], tabs[3]];

  return (
    <>
      <nav className="glass border-border safe-bottom z-40 shrink-0 border-t">
        <div className="grid grid-cols-5 px-1 pt-1.5 pb-1.5">
          <Tab {...first} active={isActive(first.href)} locale={locale} label={t(first.labelKey)} />
          <Tab {...second} active={isActive(second.href)} locale={locale} label={t(second.labelKey)} />

          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => setPostOpen(true)}
              aria-label={t("nav.post")}
              className="bg-primary text-primary-foreground grid size-12 place-items-center rounded-2xl shadow-[0_6px_18px_-6px_var(--primary)] transition-transform active:scale-90"
            >
              <Plus className="size-6" strokeWidth={2.6} />
            </button>
          </div>

          <Tab {...third} active={isActive(third.href)} locale={locale} label={t(third.labelKey)} />
          <Tab {...fourth} active={isActive(fourth.href)} locale={locale} label={t(fourth.labelKey)} />
        </div>
      </nav>

      <Sheet open={postOpen} onOpenChange={setPostOpen} title={t("nav.post")}>
        <div className="space-y-2 pb-2">
          {postOptions.map((option) => (
            <button
              key={option.slug}
              type="button"
              onClick={() => {
                setPostOpen(false);
                router.push(`/${locale}/post?category=${option.slug}`);
              }}
              className="bg-surface-2 border-border hover:bg-muted flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors active:scale-[0.99]"
            >
              <span className="bg-card text-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                <CategoryIcon slug={option.slug} className="size-5" />
              </span>
              <span className="text-sm font-semibold">{t(option.labelKey)}</span>
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}

function Tab({
  href,
  icon: Icon,
  label,
  active,
  locale,
}: {
  href: string;
  icon: typeof House;
  label: string;
  active: boolean;
  locale: string;
}) {
  return (
    <Link
      href={`/${locale}${href}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg py-1 text-[0.625rem] font-medium transition-colors",
        active ? "text-foreground" : "text-subtle-foreground hover:text-muted-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
      <span className={cn(active && "font-semibold")}>{label}</span>
    </Link>
  );
}
