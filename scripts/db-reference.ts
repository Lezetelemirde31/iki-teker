/**
 * Loads the reference data a live database needs: cities, districts, makes and
 * models.
 *
 * This is not demo content. Without it there is nothing to pick in the post
 * form's dropdowns and nothing for the search filters to match against, so a
 * real deployment needs it on day one — while wanting nothing to do with the
 * fictional listings, users and bookings that `db:seed` loads.
 *
 *   DATABASE_URL=postgres://… npm run db:reference
 *
 * Safe to re-run and safe against production: every insert skips rows that are
 * already there, and nothing is ever deleted or overwritten.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/db/schema";
import { cities, districts } from "../src/mocks/geo";
import { makes, models } from "../src/mocks/taxonomy";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error("DATABASE_URL is not set. For the embedded database use `npm run db:seed`.");
  process.exit(1);
}

async function main() {
  const client = postgres(url!, { max: 1, prepare: false });
  const db = drizzle(client, { schema });

  const report: [string, number][] = [];

  const before = async (table: string) => {
    const [row] = await client.unsafe<{ n: string }[]>(`SELECT count(*)::text AS n FROM ${table}`);
    return Number(row?.n ?? 0);
  };

  /* ---- geography -------------------------------------------------------- */
  const citiesBefore = await before("cities");
  await db
    .insert(schema.cities)
    .values(
      cities.map((city) => ({
        id: city.id,
        name: city.name,
        lat: String(city.coords.lat),
        lng: String(city.coords.lng),
        primary: city.primary,
      })),
    )
    .onConflictDoNothing();
  report.push(["cities", (await before("cities")) - citiesBefore]);

  const districtsBefore = await before("districts");
  await db
    .insert(schema.districts)
    .values(districts.map((d) => ({ id: d.id, cityId: d.cityId, name: d.name })))
    .onConflictDoNothing();
  report.push(["districts", (await before("districts")) - districtsBefore]);

  /* ---- taxonomy --------------------------------------------------------- */
  const makesBefore = await before("makes");
  await db
    .insert(schema.makes)
    .values(
      makes.map((make) => ({
        id: make.id,
        name: make.name,
        slug: make.slug,
        country: make.country,
        popular: make.popular,
        categories: make.categories,
      })),
    )
    .onConflictDoNothing();
  report.push(["makes", (await before("makes")) - makesBefore]);

  const modelsBefore = await before("models");
  await db
    .insert(schema.models)
    .values(
      models.map((model) => ({
        id: model.id,
        makeId: model.makeId,
        name: model.name,
        category: model.category,
        yearFrom: model.years[0],
        yearTo: model.years[1],
        bodyType: model.bodyType ?? null,
      })),
    )
    .onConflictDoNothing();
  report.push(["models", (await before("models")) - modelsBefore]);

  console.log("reference data:");
  for (const [table, added] of report) {
    console.log(`  ${table.padEnd(12)} ${added > 0 ? `+${added} added` : "already current"}`);
  }

  await client.end();
  console.log("\nOK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
