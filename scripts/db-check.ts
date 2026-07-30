/**
 * Proves the database enforces what the product promises.
 *
 * The prototype's headline rental claim is that double booking is impossible.
 * That is only true if the database rejects the second booking, so this script
 * actually attempts one and fails loudly if it succeeds. Row counts alone would
 * not tell us anything about correctness.
 */
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "../src/db/schema";

const DATA_DIR = process.env.PGLITE_DIR ?? "./.pglite";

const problems: string[] = [];
const fail = (message: string) => problems.push(message);

/** Unwraps Drizzle's error wrapper to reach the Postgres message underneath. */
function describe(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const err = current as { message?: string; cause?: unknown };
    if (err.message) parts.push(err.message);
    current = err.cause;
  }
  return parts.join(" | ");
}

async function main() {
  const pglite = new PGlite(DATA_DIR, { extensions: { btree_gist } });
  const db = drizzle(pglite, { schema });

  /* ---- 1. Overlapping booking must be refused ---------------------------- */
  const existing = await db.query.bookings.findFirst({
    where: inArray(schema.bookings.status, ["confirmed", "active"]),
  });
  if (!existing) {
    fail("no confirmed booking to test against");
  } else {
    // Distinguish "the insert succeeded" from "it failed for some other
    // reason" — collapsing the two would let a broken guard pass as long as
    // something else happened to throw.
    let inserted = false;
    let failure = "";
    try {
      await db.insert(schema.bookings).values({
        ...existing,
        id: "test-overlap",
        code: "TEST-OVERLAP",
        // Same offer, same dates — the exact race the guard exists for.
      });
      inserted = true;
    } catch (error) {
      // Drizzle wraps driver errors, so the Postgres message — the part that
      // names the constraint — lives on `cause`.
      failure = describe(error);
    }
    await db.delete(schema.bookings).where(eq(schema.bookings.id, "test-overlap"));

    if (inserted) {
      fail("DOUBLE BOOKING WAS ACCEPTED — the exclusion constraint is not working");
    } else if (!/bookings_no_overlap|exclusion/i.test(failure)) {
      fail(`booking was rejected, but not by the overlap guard: ${failure.slice(0, 160)}`);
    } else {
      console.log("  ✓ overlapping booking rejected by the database");
    }
  }

  /* ---- 2. A non-overlapping booking on the same offer must succeed ------- */
  if (existing) {
    let accepted = false;
    try {
      await db.insert(schema.bookings).values({
        ...existing,
        id: "test-adjacent",
        code: "TEST-ADJACENT",
        startDate: "2027-03-01",
        endDate: "2027-03-04",
      });
      accepted = true;
    } catch (error) {
      fail(`a free date range was wrongly rejected: ${String(error).slice(0, 120)}`);
    }
    await db.delete(schema.bookings).where(eq(schema.bookings.id, "test-adjacent"));
    if (accepted) console.log("  ✓ free date range on the same offer accepted");
  }

  /* ---- 3. A cancelled booking must not block its dates ------------------- */
  if (existing) {
    await db.insert(schema.bookings).values({
      ...existing,
      id: "test-cancelled",
      code: "TEST-CANCELLED",
      startDate: "2027-04-01",
      endDate: "2027-04-05",
      status: "cancelled",
    });
    let reusable = false;
    try {
      await db.insert(schema.bookings).values({
        ...existing,
        id: "test-reuse",
        code: "TEST-REUSE",
        startDate: "2027-04-01",
        endDate: "2027-04-05",
      });
      reusable = true;
    } catch {
      fail("dates held by a cancelled booking are still blocked");
    }
    await db
      .delete(schema.bookings)
      .where(inArray(schema.bookings.id, ["test-cancelled", "test-reuse"]));
    if (reusable) console.log("  ✓ cancelled booking does not hold its dates");
  }

  /* ---- 4. Referential and arithmetic sanity ------------------------------ */
  const allBookings = await db.query.bookings.findMany();
  for (const b of allBookings) {
    if (b.subtotal !== b.dayPrice * b.days) fail(`${b.code}: subtotal != dayPrice x days`);
    if (b.total !== b.subtotal + b.serviceFee + b.deposit) fail(`${b.code}: total mismatch`);
  }
  console.log(`  ✓ arithmetic consistent across ${allBookings.length} bookings`);

  const orphanOffers = await db.query.rentalOffers.findMany({ with: { listing: true } });
  for (const offer of orphanOffers) {
    if (!offer.listing) fail(`offer ${offer.id} has no listing`);
    else if (offer.listing.sellerId !== offer.ownerId) {
      fail(`offer ${offer.id}: owner does not match listing seller`);
    }
  }
  console.log(`  ✓ ${orphanOffers.length} rental offers linked to their listings`);

  /* ---- 5. The prototype's headline figures survived the transfer --------- */
  const hero = await db.query.rentalOffers.findFirst({
    where: eq(schema.rentalOffers.id, "offer-vespa-bmr"),
  });
  if (hero?.ratePerDay !== 45) fail(`hero offer day rate is ${hero?.ratePerDay}, expected 45`);
  if (hero?.deposit !== 200) fail(`hero offer deposit is ${hero?.deposit}, expected 200`);

  const heroBooking = await db.query.bookings.findFirst({
    where: eq(schema.bookings.code, "IT-2481"),
  });
  if (heroBooking?.total !== 380) fail(`IT-2481 total is ${heroBooking?.total}, expected 380`);
  console.log("  ✓ headline figures intact (₼45/day, ₼200 deposit, ₼380 total)");

  const july = await db.query.bookings.findMany({
    where: and(eq(schema.bookings.ownerId, "u-rashad"), eq(schema.bookings.status, "returned")),
  });
  const income = july
    .filter((b) => b.startDate.startsWith("2026-07"))
    .reduce((sum, b) => sum + b.subtotal, 0);
  if (income !== 640) fail(`Rəşad July income is ${income}, expected 640`);
  console.log("  ✓ derived income still ₼640");

  await pglite.close();

  console.log("");
  if (problems.length) {
    console.log(`FAILED — ${problems.length} problem(s):`);
    for (const p of problems) console.log("  ✗", p);
    process.exit(1);
  }
  console.log("OK — database enforces the product's guarantees");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
