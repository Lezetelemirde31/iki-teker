import { Eye, Flag, ListChecks, Phone, Star, Users, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SparkBars } from "@/components/admin/spark-bars";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import {
  byCategory,
  listingsPerDay,
  mostViewed,
  overview,
  recentListings,
  topSellers,
  usersPerDay,
} from "@/server/admin";
import { can } from "@/server/authorization";

/**
 * The dashboard.
 *
 * Split into what needs doing and what is simply true, in that order, because
 * somebody opening this is usually here to find out whether anything is waiting
 * on them. Totals are further down; they are worth knowing but never urgent.
 *
 * There is no revenue tile. No money has moved through this platform and there
 * is no payments table, so any figure shown there would be an invention — and
 * an invented number on a dashboard is one somebody eventually makes a decision
 * against.
 */
export const dynamic = "force-dynamic";

const az = new Intl.NumberFormat("az-AZ");

export default async function AdminDashboard() {
  if (!(await can("viewPanel"))) notFound();

  const [stats, listingTrend, userTrend, newest, viewed, sellers, categories] = await Promise.all([
    overview(),
    listingsPerDay(30),
    usersPerDay(30),
    recentListings(6),
    mostViewed(6),
    topSellers(6),
    byCategory(),
  ]);

  const statusLabel: Record<string, string> = {
    active: "Aktiv",
    moderation: "Gözləyir",
    draft: "Qaralama",
    sold: "Satılıb",
    archived: "Arxiv",
    pending: "Gözləyir",
    confirmed: "Təsdiqlənib",
    returned: "Qaytarılıb",
    cancelled: "Ləğv",
    disputed: "Mübahisəli",
  };

  const waiting =
    stats.listings.moderation + stats.openReports + stats.workshops.moderation;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold">İcmal</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {waiting > 0
            ? `${az.format(waiting)} şey cavab gözləyir.`
            : "Gözləyən heç nə yoxdur."}
        </p>
      </div>

      {/* What is waiting on somebody. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Moderasiyada elan"
          value={az.format(stats.listings.moderation)}
          hint="Təsdiq və ya rədd gözləyir"
          href="/admin/moderation"
          tone="attention"
          icon={<ListChecks className="text-subtle-foreground size-4" />}
        />
        <StatCard
          label="Açıq şikayət"
          value={az.format(stats.openReports)}
          hint="Baxılmamış report"
          href="/admin/reports"
          tone="attention"
          icon={<Flag className="text-subtle-foreground size-4" />}
        />
        <StatCard
          label="Servis gözləyir"
          value={az.format(stats.workshops.moderation)}
          hint="Kataloqa buraxılmayıb"
          href="/admin/workshops"
          tone="attention"
          icon={<Wrench className="text-subtle-foreground size-4" />}
        />
      </section>

      {/* What is simply true. */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="İstifadəçi"
          value={az.format(stats.users.total)}
          hint={`Bu ay ${az.format(stats.users.newThisMonth)} yeni${
            stats.users.suspended > 0 ? ` · ${az.format(stats.users.suspended)} bloklu` : ""
          }`}
          href="/admin/users"
          icon={<Users className="text-subtle-foreground size-4" />}
        />
        <StatCard
          label="Aktiv elan"
          value={az.format(stats.listings.active)}
          hint={`${az.format(stats.listings.sold)} satılıb · ${az.format(stats.listings.draft)} qaralama`}
          href="/admin/listings"
        />
        <StatCard
          label="VIP elan"
          value={az.format(stats.vip)}
          hint="Ödənişli yerləşdirmə"
          href="/admin/listings?vip=1"
        />
        <StatCard
          label="İcarə təklifi"
          value={az.format(stats.rentalOffers)}
          hint={`${az.format(Object.values(stats.bookings).reduce((a, b) => a + b, 0))} rezervasiya`}
          href="/admin/rentals"
        />
        <StatCard
          label="Baxış"
          value={az.format(stats.reach.views)}
          hint="Bütün elanlar üzrə cəm"
          icon={<Eye className="text-subtle-foreground size-4" />}
        />
        <StatCard
          label="Kontakt"
          value={az.format(stats.reach.contacts)}
          hint="Nömrə açılışı — promosyonun satıldığı rəqəm"
          icon={<Phone className="text-subtle-foreground size-4" />}
        />
        <StatCard
          label="Servis və randevu"
          value={az.format(stats.workshops.active)}
          hint={`${az.format(stats.appointments)} randevu`}
          href="/admin/workshops"
          icon={<Wrench className="text-subtle-foreground size-4" />}
        />
        <StatCard
          label="Rəy"
          value={az.format(stats.reviews)}
          hint="Gizlədilməmiş"
          href="/admin/reviews"
          icon={<Star className="text-subtle-foreground size-4" />}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <SparkBars data={listingTrend} label="Son 30 gündə yeni elan" />
        <SparkBars data={userTrend} label="Son 30 gündə yeni istifadəçi" />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <Panel title="Son əlavə olunan elanlar" href="/admin/listings">
          {newest.length === 0 ? (
            <Empty>Hələ elan yoxdur.</Empty>
          ) : (
            newest.map((listing) => (
              <Row key={listing.id} href={`/admin/listings/${listing.id}`}>
                <span className="min-w-0 flex-1 truncate">{listing.title}</span>
                {listing.vip && (
                  <Badge variant="vip" size="md">
                    VIP
                  </Badge>
                )}
                <Badge variant="muted" size="md">
                  {statusLabel[listing.status] ?? listing.status}
                </Badge>
              </Row>
            ))
          )}
        </Panel>

        <Panel title="Ən çox baxılan" href="/admin/listings">
          {viewed.length === 0 ? (
            <Empty>Hələ baxış yoxdur.</Empty>
          ) : (
            viewed.map((listing) => (
              <Row key={listing.id} href={`/admin/listings/${listing.id}`}>
                <span className="min-w-0 flex-1 truncate">{listing.title}</span>
                <span className="text-subtle-foreground tabular shrink-0 text-xs">
                  {az.format(listing.views)} baxış · {az.format(listing.contacts)} kontakt
                </span>
              </Row>
            ))
          )}
        </Panel>

        <Panel title="Ən aktiv satıcılar" href="/admin/users">
          {sellers.length === 0 ? (
            <Empty>Hələ satıcı yoxdur.</Empty>
          ) : (
            sellers.map((seller) => (
              <Row key={seller.id} href={`/admin/users/${seller.id}`}>
                <span className="min-w-0 flex-1 truncate">{seller.name}</span>
                {seller.status !== "active" && (
                  <Badge variant="warning" size="md">
                    Bloklu
                  </Badge>
                )}
                <span className="text-subtle-foreground tabular shrink-0 text-xs">
                  {az.format(seller.listings)} elan
                </span>
              </Row>
            ))
          )}
        </Panel>

        <Panel title="Kateqoriyalar">
          {categories.length === 0 ? (
            <Empty>Hələ aktiv elan yoxdur.</Empty>
          ) : (
            categories.map((row) => (
              <Row key={row.category} href={`/admin/listings?category=${row.category}`}>
                <span className="min-w-0 flex-1 truncate">{row.category}</span>
                <span className="text-subtle-foreground tabular shrink-0 text-xs">
                  {az.format(row.n)}
                </span>
              </Row>
            ))
          )}
        </Panel>
      </section>
    </div>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border-border rounded-xl border">
      <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h2 className="text-subtle-foreground text-[0.6875rem] font-semibold tracking-[0.08em] uppercase">
          {title}
        </h2>
        {href && (
          <Link href={href} className="text-primary text-xs font-semibold">
            Hamısı
          </Link>
        )}
      </div>
      <div className="divide-border divide-y">{children}</div>
    </div>
  );
}

function Row({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:bg-muted flex items-center gap-2 px-4 py-2.5 text-sm">
      {children}
    </Link>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-subtle-foreground px-4 py-6 text-center text-xs">{children}</p>;
}
