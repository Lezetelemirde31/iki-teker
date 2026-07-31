/**
 * Loads the prototype's mock dataset into the database.
 *
 * The mocks were written to be the real domain model rather than throwaway
 * fixtures, so this is a straight transfer: same ids, same figures, same
 * relationships. Keeping the ids means every link that already works in the
 * prototype keeps working against the database.
 *
 * Safe to re-run: it truncates first.
 */
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

import { applyConstraints, hasOverlapGuard } from "../src/db/bootstrap";
import * as schema from "../src/db/schema";
import {
  bookings as mockBookings,
  chatThreads as mockThreads,
  cities as mockCities,
  districts as mockDistricts,
  listings as mockListings,
  makes as mockMakes,
  models as mockModels,
  parts as mockParts,
  rentalOffers as mockOffers,
  reviews as mockReviews,
  users as mockUsers,
} from "../src/mocks";

const DATA_DIR = process.env.PGLITE_DIR ?? "./.pglite";

/**
 * PGlite refuses to open a directory another process still holds, and reports
 * it as a WebAssembly abort with no explanation. A dev server killed mid-run
 * leaves the lock behind, so the usual cause is worth naming.
 */
async function checkLock() {
  const { access, rm } = await import("node:fs/promises");
  const lock = path.join(DATA_DIR, "postmaster.pid");
  try {
    await access(lock);
  } catch {
    return;
  }

  if (process.env.FORCE_UNLOCK === "1") {
    await rm(lock);
    console.log("removed a stale lock (FORCE_UNLOCK=1)");
    return;
  }

  console.error(
    [
      `${DATA_DIR} is locked (${lock} exists).`,
      "",
      "Stop anything using the database first — usually a dev server started",
      "with USE_LOCAL_DB=1. If nothing is running, the lock is stale:",
      "",
      "  FORCE_UNLOCK=1 npm run db:seed",
      "",
      "Deleting the whole directory is also safe; it is rebuilt from the mocks.",
    ].join("\n"),
  );
  process.exit(1);
}

/**
 * Opens whichever database is configured and hides the difference behind three
 * operations this script needs: raw DDL, a scalar count, and close.
 *
 * Seeding a hosted database is a legitimate thing to want — a demo deployment
 * with an empty catalogue looks broken — but it truncates, so it refuses to run
 * against a hosted server unless that is said out loud.
 */
async function open() {
  const url = process.env.DATABASE_URL;

  if (url) {
    if (process.env.ALLOW_REMOTE_SEED !== "1") {
      console.error(
        [
          "DATABASE_URL is set, and this script TRUNCATES every table before loading.",
          "",
          "If that is really what you want — a demo deployment seeded with the",
          "sample catalogue — say so explicitly:",
          "",
          "  ALLOW_REMOTE_SEED=1 npm run db:seed",
          "",
          "To create the schema without touching data, use `npm run db:migrate`.",
          "To load only cities, makes and models, use `npm run db:reference`.",
        ].join("\n"),
      );
      process.exit(1);
    }

    const client = postgres(url, { max: 1, prepare: false });
    return {
      db: drizzlePostgres(client, { schema }),
      exec: (statement: string) => client.unsafe(statement),
      count: async (table: string) => {
        const [row] = await client.unsafe<{ n: string }[]>(
          `SELECT count(*)::text AS n FROM ${table}`,
        );
        return row?.n ?? "0";
      },
      close: () => client.end(),
      label: "hosted Postgres",
    };
  }

  await checkLock();
  const pglite = new PGlite(DATA_DIR, { extensions: { btree_gist } });
  return {
    db: drizzle(pglite, { schema }),
    exec: (statement: string) => pglite.exec(statement),
    count: async (table: string) => {
      const result = await pglite.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM ${table}`,
      );
      return result.rows[0]?.n ?? "0";
    },
    close: () => pglite.close(),
    label: `embedded PGlite (${DATA_DIR})`,
  };
}

async function main() {
  const engine = await open();
  const { db } = engine;
  console.log(`target: ${engine.label}\n`);

  // ---- schema -------------------------------------------------------------
  const migrationDir = path.join(process.cwd(), "drizzle");
  const { readdir } = await import("node:fs/promises");
  const files = (await readdir(migrationDir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const ddl = await readFile(path.join(migrationDir, file), "utf8");
    // drizzle-kit separates statements with a breakpoint marker.
    for (const statement of ddl.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      try {
        await engine.exec(trimmed);
      } catch (error) {
        const message = String(error);
        // Re-running against an existing database is expected.
        if (!/already exists/i.test(message)) throw error;
      }
    }
  }
  await applyConstraints(db);
  console.log(`schema applied (${files.length} migration file(s))`);
  console.log(`overlap guard  : ${(await hasOverlapGuard(db)) ? "present" : "MISSING"}`);

  // ---- clear --------------------------------------------------------------
  await db.execute(sql`
    TRUNCATE favorites, messages, chat_participants, chat_threads, reviews,
             bookings, rental_blackouts, rental_offers, listings,
             users, models, makes, districts, cities RESTART IDENTITY CASCADE
  `);

  // ---- geography and taxonomy --------------------------------------------
  await db.insert(schema.cities).values(
    mockCities.map((city) => ({
      id: city.id,
      name: city.name,
      lat: String(city.coords.lat),
      lng: String(city.coords.lng),
      primary: city.primary,
    })),
  );

  await db.insert(schema.districts).values(
    mockDistricts.map((d) => ({ id: d.id, cityId: d.cityId, name: d.name })),
  );

  await db.insert(schema.makes).values(
    mockMakes.map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      country: m.country,
      popular: m.popular,
      categories: m.categories,
    })),
  );

  await db.insert(schema.models).values(
    mockModels.map((m) => ({
      id: m.id,
      makeId: m.makeId,
      name: m.name,
      category: m.category,
      yearFrom: m.years[0],
      yearTo: m.years[1],
      bodyType: m.bodyType ?? null,
    })),
  );

  // ---- users --------------------------------------------------------------
  await db.insert(schema.users).values(
    mockUsers.map((u) => ({
      id: u.id,
      name: u.name,
      initials: u.initials,
      avatarTone: u.avatarTone,
      kind: u.kind,
      phone: u.phone,
      phoneVerified: u.phoneVerified,
      verifiedBadge: u.verifiedBadge,
      rating: String(u.rating),
      reviewsCount: u.reviewsCount,
      rentalsCount: u.rentalsCount,
      memberSince: u.memberSince,
      responseMinutes: u.responseMinutes,
      online: u.online,
      lastSeenAt: u.lastSeenAt ? new Date(u.lastSeenAt) : null,
      cityId: u.cityId,
      districtId: u.districtId,
      address: u.address ?? null,
      hours: u.hours ?? null,
      bio: u.bio ?? null,
      specialties: u.specialties ?? null,
      subscription: u.subscription ?? "none",
    })),
  );

  // ---- catalog ------------------------------------------------------------
  await db.insert(schema.listings).values([
    ...mockListings.map((l) => ({
      id: l.id,
      kind: "vehicle" as const,
      slug: l.slug,
      title: l.title,
      category: l.category,
      price: l.price,
      negotiable: l.negotiable,
      condition: l.condition,
      description: l.description,
      attributes: l.attributes,
      photos: l.photos,
      sellerId: l.sellerId,
      cityId: l.cityId,
      districtId: l.districtId,
      delivery: l.delivery,
      status: l.status,
      makeId: l.makeId,
      modelId: l.modelId,
      year: l.year,
      customsCleared: l.customsCleared,
      vip: l.promotion.vip,
      vipUntil: l.promotion.vipUntil ?? null,
      bumpsLeft: l.promotion.bumpsLeft ?? null,
      lastBumpedAt: l.promotion.lastBumpedAt ? new Date(l.promotion.lastBumpedAt) : null,
      views: l.stats.views,
      contacts: l.stats.contacts,
      favorites: l.stats.favorites,
      publishedAt: new Date(l.publishedAt),
    })),
    ...mockParts.map((p) => ({
      id: p.id,
      kind: "part" as const,
      slug: p.slug,
      title: p.title,
      category: p.category,
      price: p.price,
      negotiable: p.negotiable,
      condition: p.condition,
      description: p.description,
      attributes: p.attributes,
      photos: p.photos,
      sellerId: p.sellerId,
      cityId: p.cityId,
      districtId: p.districtId,
      delivery: p.delivery,
      status: p.status,
      brand: p.brand,
      partType: p.partType,
      partNumber: p.partNumber ?? null,
      stock: p.stock,
      localizedTitle: p.localizedTitle,
      compatibility: p.compatibility,
      vip: p.promotion.vip,
      vipUntil: p.promotion.vipUntil ?? null,
      views: p.stats.views,
      contacts: p.stats.contacts,
      favorites: p.stats.favorites,
      publishedAt: new Date(p.publishedAt),
    })),
  ]);

  // ---- rental -------------------------------------------------------------
  await db.insert(schema.rentalOffers).values(
    mockOffers.map((o) => ({
      id: o.id,
      listingId: o.listingId,
      ownerId: o.ownerId,
      ratePerHour: o.rates.hour ?? null,
      ratePerDay: o.rates.day,
      ratePerWeek: o.rates.week ?? null,
      longStayMinDays: o.rates.longStay?.minDays ?? null,
      longStayDayPrice: o.rates.longStay?.dayPrice ?? null,
      deposit: o.deposit,
      minDays: o.minDays,
      maxDays: o.maxDays,
      licenceRequired: o.licenceRequired,
      freeCancellationHours: o.freeCancellationHours,
      pickup: o.pickup,
      includes: o.includes,
      handoverTime: o.handoverTime,
      instantBook: o.instantBook,
      commissionRate: String(o.commissionRate),
    })),
  );

  // Blackouts that are not explained by a live booking stay owner-set.
  const bookedDays = new Set<string>();
  for (const b of mockBookings) {
    if (!["confirmed", "active"].includes(b.status)) continue;
    const cursor = new Date(`${b.start}T00:00:00`);
    const last = new Date(`${b.end}T00:00:00`);
    while (cursor <= last) {
      bookedDays.add(`${b.offerId}|${cursor.toISOString().slice(0, 10)}`);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const blackouts = mockOffers.flatMap((o) =>
    o.blockedDates
      .filter((day) => !bookedDays.has(`${o.id}|${day}`))
      .map((day) => ({ offerId: o.id, day })),
  );
  if (blackouts.length) await db.insert(schema.rentalBlackouts).values(blackouts);

  await db.insert(schema.bookings).values(
    mockBookings.map((b) => ({
      id: b.id,
      code: b.code,
      offerId: b.offerId,
      listingId: b.listingId,
      renterId: b.renterId,
      ownerId: b.ownerId,
      startDate: b.start,
      endDate: b.end,
      days: b.days,
      dayPrice: b.dayPrice,
      subtotal: b.subtotal,
      serviceFee: b.serviceFee,
      deposit: b.deposit,
      total: b.total,
      commission: String(b.commission),
      status: b.status,
      paymentMethod: b.paymentMethod,
      licenceStatus: b.licenceStatus,
      agreementSigned: b.agreementSigned,
      handover: b.handover ?? null,
      returnCheck: b.returnCheck ?? null,
      createdAt: new Date(b.createdAt),
    })),
  );

  // ---- trust and messaging ------------------------------------------------
  await db.insert(schema.reviews).values(
    mockReviews.map((r) => ({
      id: r.id,
      authorId: r.authorId,
      targetId: r.targetId,
      rating: r.rating,
      text: r.text,
      context: r.context,
      subject: r.subject,
      verifiedTransaction: r.verifiedTransaction,
      createdAt: new Date(r.createdAt),
    })),
  );

  await db.insert(schema.chatThreads).values(
    mockThreads.map((t) => ({
      id: t.id,
      listingId: t.listingId ?? null,
      bookingId: t.bookingId ?? null,
      contactRevealed: t.contactRevealed,
      archived: t.archived,
      updatedAt: new Date(t.updatedAt),
    })),
  );

  await db.insert(schema.chatParticipants).values(
    mockThreads.flatMap((t) => t.participantIds.map((userId) => ({ threadId: t.id, userId }))),
  );

  await db.insert(schema.messages).values(
    mockThreads.flatMap((t) =>
      t.messages.map((m) => ({
        id: m.id,
        threadId: t.id,
        authorId: m.authorId,
        kind: m.kind,
        body: m.body ?? null,
        fileName: m.fileName ?? null,
        fileSize: m.fileSize ?? null,
        readByRecipient: m.readByRecipient,
        createdAt: new Date(m.createdAt),
      })),
    ),
  );

  // ---- report -------------------------------------------------------------
  const count = engine.count;

  console.log("\nseeded:");
  for (const table of [
    "cities",
    "districts",
    "makes",
    "models",
    "users",
    "listings",
    "rental_offers",
    "rental_blackouts",
    "bookings",
    "reviews",
    "chat_threads",
    "messages",
  ]) {
    console.log(`  ${table.padEnd(18)} ${(await count(table)).padStart(4)}`);
  }

  await engine.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
