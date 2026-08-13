import { BadgeCheck, Clock, MapPin, Phone, Star, Truck } from "lucide-react";
import { notFound } from "next/navigation";

import { CategoryIcon } from "@/components/common/category-icon";
import { AppHeader } from "@/components/layout/app-header";
import { PageTransition } from "@/components/motion/page-transition";
import { AppointmentForm } from "@/components/service/appointment-form";
import { Badge } from "@/components/ui/badge";
import { isLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import { formatNumber, formatPrice, formatRating } from "@/lib/format";
import { clockToMinute, getWorkshop } from "@/server/workshops";

/**
 * One workshop: who they are, what they charge, and a form to book them.
 *
 * The menu is above the form on purpose. Somebody arriving here wants to know
 * whether this shop does the thing they need and roughly what it costs before
 * they are asked for a date — a booking form at the top would be asking for a
 * commitment before giving them anything to decide on.
 */
export default async function WorkshopPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();

  const workshop = await getWorkshop(slug);
  if (!workshop) notFound();

  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  const openMinute = clockToMinute(workshop.hours.open) ?? 0;
  const closeMinute = clockToMinute(workshop.hours.close) ?? 0;

  const duration = (minutes: number) =>
    minutes >= 120
      ? t("services.durationHours", { hours: Math.round(minutes / 60) })
      : t("services.duration", { minutes });

  return (
    <PageTransition>
      <AppHeader back title={workshop.name} />

      <main className="web-page no-scrollbar flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-6 px-4 py-4">
          <section className="flex items-start gap-3">
            <span className="bg-muted text-foreground grid size-14 shrink-0 place-items-center rounded-2xl">
              <CategoryIcon slug="services" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="font-display truncate text-lg font-extrabold">{workshop.name}</h1>
                {workshop.verified && (
                  <BadgeCheck className="text-rental size-4 shrink-0" strokeWidth={2.4} />
                )}
              </div>
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                <Star className="fill-primary text-primary size-3.5" />
                {formatRating(workshop.rating, locale)}
                <span className="text-subtle-foreground">
                  ·{" "}
                  {t("services.reviews", {
                    count: formatNumber(workshop.reviewsCount, locale),
                  })}
                </span>
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {workshop.verified && (
                  <Badge variant="rentalSoft" size="md">
                    <BadgeCheck className="size-3" /> {t("services.verified")}
                  </Badge>
                )}
                {workshop.mobileService && (
                  <Badge variant="muted" size="md">
                    <Truck className="size-3" /> {t("services.mobileService")}
                  </Badge>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-1.5">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Clock className="size-3.5 shrink-0" />
              {t("services.hours", { open: workshop.hours.open, close: workshop.hours.close })}
              <span className="text-subtle-foreground">· {workshop.hours.days[locale]}</span>
            </p>
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <MapPin className="size-3.5 shrink-0" />
              {workshop.address[locale]}
            </p>
            <a
              href={`tel:${workshop.phone.replace(/\s/g, "")}`}
              className="text-rental flex items-center gap-1.5 text-xs font-semibold"
            >
              <Phone className="size-3.5 shrink-0" />
              {workshop.phone}
            </a>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
              {t("services.about")}
            </h2>
            <p className="text-sm leading-relaxed">{workshop.about[locale]}</p>
          </section>

          {workshop.services.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                {t("services.menu")}
              </h2>
              <div className="border-border divide-border divide-y rounded-xl border">
                {workshop.services.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-3.5 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name[locale]}</p>
                      <p className="text-subtle-foreground mt-0.5 text-[0.6875rem]">
                        {duration(item.durationMinutes)}
                      </p>
                    </div>
                    <p className="tabular shrink-0 text-sm font-semibold">
                      {t("services.priceFrom", { price: formatPrice(item.priceFrom, locale) })}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {workshop.services.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.12em] uppercase">
                {t("appointment.title")}
              </h2>
              <AppointmentForm
                workshopId={workshop.id}
                services={workshop.services}
                openMinute={openMinute}
                closeMinute={closeMinute}
                locale={locale}
              />
            </section>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
