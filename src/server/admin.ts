import "server-only";

import { and, count, desc, eq, gte, inArray, sql, sum } from "drizzle-orm";

import { db } from "@/db/client";
import * as schema from "@/db/schema";

import { can } from "./authorization";
import { recordAction } from "./audit";
import { currentUserId } from "./session";
import { useDatabase } from "./source";

/**
 * What the panel reads.
 *
 * Every figure here comes from a column that something in the product actually
 * writes. Nothing is estimated and nothing is filled in to make a card look
 * complete — a dashboard that invents a number is worse than one that omits it,
 * because a made-up figure gets acted on.
 *
 * That is why there is no revenue section: no money has ever changed hands
 * through this platform, there is no payments table, and a "monthly revenue"
 * tile would be a decoration pretending to be an accounting figure. It arrives
 * when payments do.
 */

export type Overview = {
  users: { total: number; newThisMonth: number; suspended: number };
  listings: { active: number; moderation: number; draft: number; sold: number; archived: number };
  vip: number;
  rentalOffers: number;
  bookings: Record<string, number>;
  reach: { views: number; contacts: number; favorites: number };
  workshops: { active: number; moderation: number };
  appointments: number;
  reviews: number;
  openReports: number;
};

const EMPTY: Overview = {
  users: { total: 0, newThisMonth: 0, suspended: 0 },
  listings: { active: 0, moderation: 0, draft: 0, sold: 0, archived: 0 },
  vip: 0,
  rentalOffers: 0,
  bookings: {},
  reach: { views: 0, contacts: 0, favorites: 0 },
  workshops: { active: 0, moderation: 0 },
  appointments: 0,
  reviews: 0,
  openReports: 0,
};

export async function overview(): Promise<Overview> {
  if (!useDatabase) return EMPTY;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    userRows,
    listingRows,
    vipRow,
    offerRow,
    bookingRows,
    reachRow,
    workshopRows,
    appointmentRow,
    reviewRow,
    reportRow,
    newUserRow,
  ] = await Promise.all([
    db.select({ status: schema.users.status, n: count() }).from(schema.users).groupBy(schema.users.status),
    db
      .select({ status: schema.listings.status, n: count() })
      .from(schema.listings)
      .groupBy(schema.listings.status),
    db.select({ n: count() }).from(schema.listings).where(eq(schema.listings.vip, true)),
    db.select({ n: count() }).from(schema.rentalOffers),
    db
      .select({ status: schema.bookings.status, n: count() })
      .from(schema.bookings)
      .groupBy(schema.bookings.status),
    db
      .select({
        views: sum(schema.listings.views),
        contacts: sum(schema.listings.contacts),
        favorites: sum(schema.listings.favorites),
      })
      .from(schema.listings),
    db
      .select({ status: schema.workshops.status, n: count() })
      .from(schema.workshops)
      .groupBy(schema.workshops.status),
    db.select({ n: count() }).from(schema.appointments),
    db.select({ n: count() }).from(schema.reviews).where(eq(schema.reviews.hidden, false)),
    db.select({ n: count() }).from(schema.complaints).where(eq(schema.complaints.status, "open")),
    db
      .select({ n: count() })
      .from(schema.users)
      .where(gte(schema.users.memberSince, monthStart.toISOString().slice(0, 10))),
  ]);

  const byStatus = (rows: { status: string; n: number }[], key: string) =>
    rows.find((row) => row.status === key)?.n ?? 0;

  return {
    users: {
      total: userRows.reduce((sum, row) => sum + row.n, 0),
      newThisMonth: newUserRow[0]?.n ?? 0,
      suspended: byStatus(userRows, "suspended") + byStatus(userRows, "banned"),
    },
    listings: {
      active: byStatus(listingRows, "active"),
      moderation: byStatus(listingRows, "moderation"),
      draft: byStatus(listingRows, "draft"),
      sold: byStatus(listingRows, "sold"),
      archived: byStatus(listingRows, "archived"),
    },
    vip: vipRow[0]?.n ?? 0,
    rentalOffers: offerRow[0]?.n ?? 0,
    bookings: Object.fromEntries(bookingRows.map((row) => [row.status, row.n])),
    reach: {
      views: Number(reachRow[0]?.views ?? 0),
      contacts: Number(reachRow[0]?.contacts ?? 0),
      favorites: Number(reachRow[0]?.favorites ?? 0),
    },
    workshops: {
      active: byStatus(workshopRows, "active"),
      moderation: byStatus(workshopRows, "moderation"),
    },
    appointments: appointmentRow[0]?.n ?? 0,
    reviews: reviewRow[0]?.n ?? 0,
    openReports: reportRow[0]?.n ?? 0,
  };
}

/** Workshops waiting to be let into the directory. */
export async function pendingWorkshopCount(): Promise<number> {
  if (!useDatabase) return 0;
  const rows = await db
    .select({ n: count() })
    .from(schema.workshops)
    .where(eq(schema.workshops.status, "moderation"));
  return rows[0]?.n ?? 0;
}

/** The newest listings, whatever their state — what just came in. */
export async function recentListings(limit = 8) {
  if (!useDatabase) return [];
  return db.query.listings.findMany({
    orderBy: desc(schema.listings.publishedAt),
    limit,
    columns: { id: true, title: true, status: true, price: true, publishedAt: true, vip: true },
  });
}

/** Most looked at, among listings anyone can currently see. */
export async function mostViewed(limit = 8) {
  if (!useDatabase) return [];
  return db.query.listings.findMany({
    where: eq(schema.listings.status, "active"),
    orderBy: desc(schema.listings.views),
    limit,
    columns: { id: true, title: true, views: true, contacts: true, price: true },
  });
}

/**
 * Sellers with the most live listings.
 *
 * Counted from listings rather than read off `users.listingsCount`, because a
 * denormalised counter is only as true as the last thing that remembered to
 * update it, and this is a number somebody might act on.
 */
export async function topSellers(limit = 8) {
  if (!useDatabase) return [];

  return db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      kind: schema.users.kind,
      status: schema.users.status,
      listings: count(schema.listings.id),
      views: sum(schema.listings.views),
    })
    .from(schema.users)
    .innerJoin(schema.listings, eq(schema.listings.sellerId, schema.users.id))
    .where(eq(schema.listings.status, "active"))
    .groupBy(schema.users.id, schema.users.name, schema.users.kind, schema.users.status)
    .orderBy(desc(count(schema.listings.id)))
    .limit(limit);
}

/**
 * New listings per day over a window — the growth line.
 *
 * Views and contacts have no equivalent: those columns hold a running total
 * with no history behind them, so "views this week" cannot be answered without
 * inventing it. Only what was actually recorded with a timestamp is charted.
 */
export async function listingsPerDay(days = 30) {
  if (!useDatabase) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  return db
    .select({
      day: sql<string>`to_char(${schema.listings.publishedAt}, 'YYYY-MM-DD')`,
      n: count(),
    })
    .from(schema.listings)
    .where(gte(schema.listings.publishedAt, since))
    .groupBy(sql`to_char(${schema.listings.publishedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${schema.listings.publishedAt}, 'YYYY-MM-DD')`);
}

/** New accounts per day, from the same window. */
export async function usersPerDay(days = 30) {
  if (!useDatabase) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  return db
    .select({ day: sql<string>`${schema.users.memberSince}::text`, n: count() })
    .from(schema.users)
    .where(gte(schema.users.memberSince, since.toISOString().slice(0, 10)))
    .groupBy(schema.users.memberSince)
    .orderBy(schema.users.memberSince);
}

/** How the catalogue splits by category — which sections are actually used. */
export async function byCategory() {
  if (!useDatabase) return [];

  return db
    .select({ category: schema.listings.category, n: count() })
    .from(schema.listings)
    .where(and(eq(schema.listings.status, "active")))
    .groupBy(schema.listings.category)
    .orderBy(desc(count()));
}

/* -------------------------------------------------------------------------- */
/*  Rentals                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Every booking, newest first.
 *
 * Read-only. Nothing in the panel moves a booking between states: the owner
 * confirms or declines, and the exclusion constraint arbitrates. An admin
 * button that overrode either would quietly become the way disputes get
 * settled, without any of the checks the real path has.
 *
 * Names are fetched in one extra query rather than through drizzle relations —
 * `bookings` points at `users` twice, as renter and as owner, and telling those
 * apart needs a declared name on both sides of each.
 */
export async function allBookings(limit = 200) {
  if (!useDatabase) return [];

  const rows = await db.query.bookings.findMany({
    orderBy: desc(schema.bookings.createdAt),
    limit,
  });
  if (rows.length === 0) return [];

  const people = [...new Set(rows.flatMap((row) => [row.renterId, row.ownerId]))];
  const listings = [...new Set(rows.map((row) => row.listingId))];

  const [names, titles] = await Promise.all([
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(inArray(schema.users.id, people)),
    db
      .select({ id: schema.listings.id, title: schema.listings.title })
      .from(schema.listings)
      .where(inArray(schema.listings.id, listings)),
  ]);

  const nameOf = new Map(names.map((row) => [row.id, row.name]));
  const titleOf = new Map(titles.map((row) => [row.id, row.title]));

  return rows.map((row) => ({
    ...row,
    renterName: nameOf.get(row.renterId) ?? row.renterId,
    ownerName: nameOf.get(row.ownerId) ?? row.ownerId,
    listingTitle: titleOf.get(row.listingId) ?? row.listingId,
  }));
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                      */
/* -------------------------------------------------------------------------- */

export type UserFilter = {
  search?: string;
  status?: string;
  role?: string;
  limit?: number;
};

/**
 * The account list.
 *
 * Listing counts are joined rather than read off `users.listingsCount`, for the
 * same reason the dashboard does it: a denormalised counter is only as true as
 * the last thing that remembered to update it, and this is a number somebody
 * decides whether to ban an account over.
 */
export async function allUsers(filter: UserFilter = {}) {
  if (!useDatabase) return [];

  const clauses = [];
  if (filter.search?.trim()) {
    const term = `%${filter.search.trim().toLowerCase()}%`;
    clauses.push(
      sql`(lower(${schema.users.name}) LIKE ${term}
        OR lower(coalesce(${schema.users.email}, '')) LIKE ${term}
        OR coalesce(${schema.users.phone}, '') LIKE ${term}
        OR ${schema.users.id} LIKE ${term})`,
    );
  }
  if (filter.status) clauses.push(eq(schema.users.status, filter.status as "active"));
  if (filter.role) clauses.push(eq(schema.users.role, filter.role as "user"));

  const rows = await db.query.users.findMany({
    ...(clauses.length ? { where: and(...clauses) } : {}),
    orderBy: desc(schema.users.memberSince),
    limit: filter.limit ?? 200,
  });
  if (rows.length === 0) return [];

  const counts = await db
    .select({ sellerId: schema.listings.sellerId, n: count() })
    .from(schema.listings)
    .where(inArray(schema.listings.sellerId, rows.map((row) => row.id)))
    .groupBy(schema.listings.sellerId);
  const countOf = new Map(counts.map((row) => [row.sellerId, row.n]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    phoneVerified: row.phoneVerified,
    verifiedBadge: row.verifiedBadge,
    kind: row.kind,
    role: row.role,
    status: row.status,
    memberSince: String(row.memberSince),
    rating: Number(row.rating),
    listings: countOf.get(row.id) ?? 0,
  }));
}

export type UserActionResult =
  | { ok: true }
  | { ok: false; reason: "notAllowed" | "notFound" | "invalid" | "lastSuperadmin" | "self" };

/**
 * Stopping an account, or letting it back in.
 *
 * Nothing is deleted. A banned account keeps its listings, its bookings and its
 * history — the ban is a state, and states can be wrong. Deleting would take
 * the other side of every conversation with it.
 */
export async function setUserStatus(
  userId: string,
  status: string,
  note?: string,
): Promise<UserActionResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };
  if (!(await can("manageUsers"))) return { ok: false, reason: "notAllowed" };
  if (!["active", "suspended", "banned"].includes(status)) return { ok: false, reason: "invalid" };

  const actorId = await currentUserId();
  // Locking yourself out of the panel is a mistake nobody recovers from
  // without a database console.
  if (userId === actorId) return { ok: false, reason: "self" };

  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, name: true, status: true },
  });
  if (!row) return { ok: false, reason: "notFound" };

  await db
    .update(schema.users)
    .set({ status: status as "active" })
    .where(eq(schema.users.id, userId));

  if (status !== "active") {
    // A stopped account must stop now, not when its session happens to expire.
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  }

  await recordAction({
    actorId,
    action: status === "active" ? "reinstateUser" : "suspendUser",
    entityType: "user",
    entityId: userId,
    entityLabel: row.name,
    from: row.status,
    to: status,
    note: note ?? null,
  });

  return { ok: true };
}

/** Granting or removing a role. Only a superadmin, and never your own. */
export async function setUserRole(userId: string, role: string): Promise<UserActionResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };
  if (!(await can("manageRoles"))) return { ok: false, reason: "notAllowed" };
  if (!["user", "support", "moderator", "admin", "superadmin"].includes(role)) {
    return { ok: false, reason: "invalid" };
  }

  const actorId = await currentUserId();
  if (userId === actorId) return { ok: false, reason: "self" };

  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, name: true, role: true },
  });
  if (!row) return { ok: false, reason: "notFound" };

  // The last superadmin cannot be demoted, or nobody can grant roles again.
  if (row.role === "superadmin" && role !== "superadmin") {
    const supers = await db
      .select({ n: count() })
      .from(schema.users)
      .where(eq(schema.users.role, "superadmin"));
    if ((supers[0]?.n ?? 0) <= 1) return { ok: false, reason: "lastSuperadmin" };
  }

  await db
    .update(schema.users)
    .set({ role: role as "user" })
    .where(eq(schema.users.id, userId));

  await recordAction({
    actorId,
    action: "setRole",
    entityType: "user",
    entityId: userId,
    entityLabel: row.name,
    from: row.role,
    to: role,
  });

  return { ok: true };
}

/** The "verified seller" badge — a manual trust signal, so a person grants it. */
export async function setUserVerified(
  userId: string,
  verified: boolean,
): Promise<UserActionResult> {
  if (!useDatabase) return { ok: false, reason: "notFound" };
  if (!(await can("manageUsers"))) return { ok: false, reason: "notAllowed" };

  const row = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { id: true, name: true, verifiedBadge: true },
  });
  if (!row) return { ok: false, reason: "notFound" };

  await db
    .update(schema.users)
    .set({ verifiedBadge: verified })
    .where(eq(schema.users.id, userId));

  await recordAction({
    actorId: await currentUserId(),
    action: verified ? "verifySeller" : "unverifySeller",
    entityType: "user",
    entityId: userId,
    entityLabel: row.name,
    from: row.verifiedBadge ? "verified" : "unverified",
    to: verified ? "verified" : "unverified",
  });

  return { ok: true };
}
