import { notFound } from "next/navigation";
import { Star } from "lucide-react";

import { HazardDivider } from "@/components/brand/hazard-divider";
import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/i18n/locale-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { isLocale, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import {
  formatDate,
  formatNumber,
  formatMileage,
  formatPrice,
  formatRating,
  formatRelativeTime,
  localized,
} from "@/lib/format";
import {
  availableToRent,
  categoryCounts,
  getAdminOverview,
  getDashboard,
  getHomeFeed,
  getUser,
  locationOf,
  quote,
} from "@/lib/queries";
import { chatThreads, workshops } from "@/mocks";
import { cn } from "@/lib/utils";

/**
 * Module 1 verification screen.
 *
 * Renders live records straight out of the seeded datasets — no hard-coded
 * strings — so the data model can be reviewed before any real screen is built.
 * Replaced by the landing page in module 4.
 */
export default async function DataPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = createTranslator(await getMessages(locale));
  const feed = getHomeFeed();
  const counts = categoryCounts();
  const dashboard = getDashboard("u-rashad");
  const admin = getAdminOverview();
  const rentals = availableToRent(4);
  const heroRental = rentals[0];
  const heroQuote = heroRental ? quote(heroRental.offer, "2026-08-08", "2026-08-12") : undefined;
  const thread = chatThreads[0];

  return (
    <>
      <header className="glass z-40 shrink-0">
        <div className="flex items-center justify-between px-4 pt-2 pb-3">
          <Logo />
          <LocaleSwitcher />
        </div>
        <HazardDivider />
      </header>

      <main className="no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-7 px-4 py-6">
          <section className="space-y-2">
            <p className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
              Module 1 · Domain data
            </p>
            <h1 className="text-3xl leading-[1.1] font-extrabold text-balance">
              {t("app.tagline")}
            </h1>
            <p className="text-muted-foreground text-sm text-pretty">
              Every figure below is read from the seeded datasets and formatted for{" "}
              {locale.toUpperCase()}.
            </p>
          </section>

          <Section title="Catalog">
            <div className="grid grid-cols-3 gap-2">
              <Stat value={counts.motorcycles + counts.scooters + counts.electric + counts.bicycles} label={t("categories.motorcycles")} locale={locale} />
              <Stat value={counts.parts} label={t("categories.parts")} locale={locale} />
              <Stat value={counts.gear} label={t("categories.gear")} locale={locale} />
              <Stat value={feed.rentals.length} label={t("categories.rental")} locale={locale} />
              <Stat value={workshops.length} label={t("categories.services")} locale={locale} />
              <Stat value={admin.metrics.pendingModeration} label="In moderation" locale={locale} />
            </div>
          </Section>

          <Section title={`${t("categories.rental")} · ${t("common.today")}`}>
            <div className="space-y-2">
              {rentals.map(({ listing, offer }) => {
                const place = locationOf(listing);
                const free = offer.availableFrom <= "2026-07-27";
                return (
                  <article
                    key={listing.id}
                    className="bg-card border-border press flex items-center gap-3 rounded-lg border p-3"
                  >
                    <div
                      className={cn(
                        "size-14 shrink-0 rounded-md bg-gradient-to-br",
                        toneGradient(listing.photos[0]?.tone),
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-wide uppercase",
                            free
                              ? "bg-rental text-rental-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {free ? t("common.today") : formatDate(offer.availableFrom, locale, "dayMonth")}
                        </span>
                        {listing.promotion.vip && (
                          <span className="bg-vip text-vip-foreground rounded px-1.5 py-0.5 text-[0.5625rem] font-bold">
                            VIP
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold">{listing.title}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {localized(place.district?.name, locale)} ·{" "}
                        {t("common.deposit")} {formatPrice(offer.deposit, locale)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display tabular text-base font-extrabold">
                        {formatPrice(offer.rates.day, locale)}
                      </p>
                      <p className="text-subtle-foreground text-[0.625rem]">{t("common.perDay")}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </Section>

          {heroRental && heroQuote && (
            <Section title="Live quote · 8 → 12 Aug">
              <div className="bg-card border-border space-y-2 rounded-lg border p-4 text-sm">
                <Row
                  label={`${formatPrice(heroQuote.dayPrice, locale)} × ${heroQuote.days}`}
                  value={formatPrice(heroQuote.subtotal, locale)}
                />
                <Row label={t("common.deposit")} value={formatPrice(heroQuote.deposit, locale)} />
                <div className="border-border mt-1 flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Due on pickup</span>
                  <span className="font-display tabular text-lg font-extrabold">
                    {formatPrice(heroQuote.total, locale)}
                  </span>
                </div>
                <p className="text-subtle-foreground text-[0.6875rem]">
                  {heroRental.offer.blockedDates.length} blocked dates · commission{" "}
                  {formatPrice(heroQuote.commission, locale, { decimals: true })}
                </p>
              </div>
            </Section>
          )}

          <Section title="Listings">
            <div className="space-y-2">
              {feed.fresh.slice(0, 4).map((listing) => {
                const place = locationOf(listing);
                return (
                  <article
                    key={listing.id}
                    className="bg-card border-border press rounded-lg border p-3"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{listing.title}</p>
                      <p className="font-display tabular shrink-0 text-base font-extrabold">
                        {formatPrice(listing.price, locale)}
                      </p>
                    </div>
                    <p className="text-muted-foreground mt-0.5 truncate text-xs">
                      {typeof listing.attributes.engineCc === "number" &&
                        `${listing.attributes.engineCc} cm³ · `}
                      {typeof listing.attributes.mileage === "number" &&
                        `${formatMileage(listing.attributes.mileage, locale)} · `}
                      {localized(place.city?.name, locale)}
                    </p>
                    <p className="text-subtle-foreground mt-1 text-[0.6875rem]">
                      {formatRelativeTime(listing.publishedAt, locale)} · {listing.stats.views} views ·{" "}
                      {listing.stats.contacts} contacts
                    </p>
                  </article>
                );
              })}
            </div>
          </Section>

          <Section title="Seller dashboard · Rəşad M.">
            <div className="grid grid-cols-3 gap-2">
              <Stat value={dashboard.stats.activeCount} label="Active" locale={locale} />
              <Stat value={dashboard.stats.views} label="Views" locale={locale} />
              <Stat value={dashboard.stats.contacts} label="Contacts" locale={locale} />
            </div>
            <div className="bg-card border-border divide-border mt-2 divide-y rounded-lg border">
              <Row
                className="px-4 py-3"
                label="Booking requests"
                value={`${dashboard.pendingRequests.length} new`}
                accent
              />
              <Row
                className="px-4 py-3"
                label="Monthly income"
                value={formatPrice(dashboard.monthlyIncome, locale)}
              />
            </div>
          </Section>

          <Section title="Workshops">
            <div className="space-y-2">
              {feed.workshops.slice(0, 3).map((workshop) => (
                <article
                  key={workshop.id}
                  className="bg-card border-border press rounded-lg border p-3"
                >
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{workshop.name}</p>
                    {workshop.promoted && (
                      <span className="bg-primary-soft text-foreground rounded px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-wide uppercase">
                        Promoted
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                    <Star className="fill-primary text-primary size-3" />
                    {formatRating(workshop.rating, locale)} · {workshop.reviewsCount} ·{" "}
                    {workshop.distanceKm} km
                  </p>
                  <p className="text-subtle-foreground mt-1 truncate text-[0.6875rem]">
                    {localized(workshop.summary, locale)}
                  </p>
                </article>
              ))}
            </div>
          </Section>

          {thread && (
            <Section title="Chat">
              <div className="bg-card border-border space-y-2 rounded-lg border p-3">
                {thread.messages.slice(0, 3).map((msg) => {
                  const mine = msg.authorId === "u-rashad";
                  return (
                    <div key={msg.id} className={cn("flex", mine && "justify-end")}>
                      <p
                        className={cn(
                          "max-w-[80%] rounded-xl px-3 py-2 text-xs",
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm",
                        )}
                      >
                        {msg.body ?? msg.fileName}
                      </p>
                    </div>
                  );
                })}
                <p className="text-subtle-foreground pt-1 text-[0.625rem]">
                  {getUser(thread.participantIds[1] ?? "")?.name} ·{" "}
                  {thread.contactRevealed ? "contact revealed" : "contact locked until confirmed"}
                </p>
              </div>
            </Section>
          )}

          <Section title={t("settings.appearance")}>
            <ThemeToggle />
          </Section>
        </div>
      </main>

      <nav className="glass border-border safe-bottom z-40 shrink-0 border-t">
        <div className="text-muted-foreground grid grid-cols-5 px-2 py-2 text-[0.625rem] font-medium">
          {[t("nav.home"), t("nav.search"), t("nav.post"), t("nav.chats"), t("nav.account")].map(
            (label, index) => (
              <span
                key={label}
                className={cn(
                  "flex flex-col items-center gap-1",
                  index === 0 && "text-foreground font-semibold",
                )}
              >
                <span
                  className={cn(
                    index === 2
                      ? "bg-primary text-primary-foreground grid size-7 place-items-center rounded-full text-base leading-none font-bold"
                      : "bg-muted size-7 rounded-full",
                  )}
                >
                  {index === 2 ? "+" : ""}
                </span>
                {label}
              </span>
            ),
          )}
        </div>
      </nav>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.14em] uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ value, label, locale }: { value: number; label: string; locale: Locale }) {
  return (
    <div className="bg-card border-border rounded-lg border px-3 py-2.5">
      <p className="font-display tabular text-xl leading-none font-extrabold">
        {formatNumber(value, locale)}
      </p>
      <p className="text-subtle-foreground mt-1 truncate text-[0.625rem]">{label}</p>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <span className="text-muted-foreground text-sm">{label}</span>
      <span
        className={cn("tabular text-sm font-semibold", accent && "text-destructive")}
      >
        {value}
      </span>
    </div>
  );
}

/** Temporary stand-in for the generated listing artwork built in module 3. */
function toneGradient(tone: string | undefined) {
  const map: Record<string, string> = {
    sand: "from-[#e8dcc4] to-[#cbb994]",
    clay: "from-[#e2cdbd] to-[#c19d84]",
    olive: "from-[#d9dcc0] to-[#a8ae86]",
    sage: "from-[#cfdcd0] to-[#9db3a0]",
    slate: "from-[#d4d8dd] to-[#9aa4b0]",
    steel: "from-[#dcdee0] to-[#a9aeb4]",
    dusk: "from-[#d5d0dd] to-[#a09aad]",
    amber: "from-[#f2e0b8] to-[#d8b878]",
  };
  return map[tone ?? "sand"] ?? map.sand;
}
