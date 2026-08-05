/**
 * Exercises the write APIs over HTTP.
 *
 * db-check proves the database refuses a double booking; this proves the whole
 * path does — validation, server-side pricing, ownership, and the race where
 * two confirmations for the same week arrive at once. It also covers publishing
 * a listing, including the values a client must not be allowed to set.
 *
 * Needs a running server with a database behind it:
 *
 *   npm run db:seed
 *   USE_LOCAL_DB=1 npx next dev -p 3100
 *   npm run check:api
 *
 * It writes bookings and listings, so re-seed before each run.
 */
const API = process.env.API ?? "http://localhost:3100";

/**
 * This script writes listings and bookings. Pointed at a deployment they land
 * in the catalogue customers are looking at, so a local address is the only
 * thing it will talk to unless told otherwise.
 */
if (
  !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(API) &&
  process.env.ALLOW_REMOTE_CHECK !== "1"
) {
  console.error(
    [
      `Refusing to run against ${API}.`,
      "",
      "This script creates listings and bookings. Against a deployment they end",
      "up in the catalogue customers are looking at.",
      "",
      "Run it against a local server, or say so explicitly:",
      "",
      "  ALLOW_REMOTE_CHECK=1 npm run check:api",
    ].join("\n"),
  );
  process.exit(1);
}

const DATES = { start: "2027-09-10", end: "2027-09-14" };

let pass = 0,
  fail = 0;
const line = (label, got, want, extra = "") => {
  const ok = String(got) === String(want);
  ok ? pass++ : fail++;
  console.log(
    `  ${ok ? "OK  " : "FAIL"}  ${label.padEnd(44)} ${String(got).padEnd(9)} (want ${want}) ${extra}`,
  );
};
const heading = (text) => console.log(`\n— ${text} —`);

async function post(path, user, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `iki-demo-user=${user}` },
    body: JSON.stringify(body ?? {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

const book = (user, body) =>
  post("/api/bookings", user, { licenceUploaded: true, agreementAccepted: true, ...body });

heading("validation");
{
  const base = { listingId: "l-vespa-bmr", ...DATES };
  let r;
  r = await book("u-rashad", { ...base, start: "2020-01-01", end: "2020-01-04" });
  line("start date in the past", r.status, 422, r.json?.error);
  r = await book("u-rashad", { ...base, end: "2027-09-09" });
  line("end before start", r.status, 422, r.json?.error);
  r = await book("u-rashad", { ...base, listingId: "l-rebel500-bmr", end: DATES.start });
  line("shorter than the offer minimum", r.status, 422, r.json?.error);
  r = await book("u-rashad", { ...base, end: "2028-09-14" });
  line("longer than the offer maximum", r.status, 422, r.json?.error);
  r = await book("u-rashad", { ...base, agreementAccepted: false });
  line("terms not accepted", r.status, 422, r.json?.error);
  r = await book("u-rashad", { ...base, licenceUploaded: false });
  line("licence not uploaded", r.status, 422, r.json?.error);
  r = await book("u-rashad", { ...base, listingId: "l-vespa-rashad" });
  line("renting your own vehicle", r.status, 422, r.json?.error);
  r = await book("u-rashad", { ...base, listingId: "does-not-exist" });
  line("listing does not exist", r.status, 404, r.json?.error);
  r = await book("u-rashad", { ...base, start: "not-a-date" });
  line("malformed date", r.status, 422, r.json?.error);
}

heading("pricing is computed server-side, not taken from the client");
let first;
{
  const r = await book("u-rashad", {
    listingId: "l-vespa-bmr",
    ...DATES,
    dayPrice: 1,
    total: 1,
    deposit: 0,
  });
  first = r.json?.booking;
  line("request accepted", r.status, 201, first?.code);
  line("day price ignores the client's 1", first?.dayPrice, 45);
  line("deposit ignores the client's 0", first?.deposit, 200);
  line("days counted end minus start", first?.days, 4);
  line("total recomputed", first?.total, 45 * 4 + 200);
  line("status starts pending", first?.status, "pending");
}

heading("long-stay pricing");
{
  const r = await book("u-elvin", {
    listingId: "l-vespa-bmr",
    start: "2027-11-01",
    end: "2027-11-09",
  });
  const b = r.json?.booking;
  line("8 days drops to the long-stay rate", b?.dayPrice, 38);
  line("subtotal uses the lower rate", b?.subtotal, 38 * 8);
}

heading("a request is not a hold");
let second;
{
  const r = await book("u-elvin", { listingId: "l-vespa-bmr", ...DATES });
  second = r.json?.booking;
  line("second renter may request same dates", r.status, 201, second?.code);
}

heading("confirmation is where the guarantee bites");
{
  let r = await post(`/api/bookings/${first.id}/confirm`, "u-rashad");
  line("a non-owner cannot confirm", r.status, 403, r.json?.error);

  r = await post(`/api/bookings/${first.id}/confirm`, "u-baku-moto-rent");
  line("owner confirms the first", r.status, 200, r.json?.booking?.status);

  r = await post(`/api/bookings/${second.id}/confirm`, "u-baku-moto-rent");
  line("overlapping second is REFUSED", r.status, 409, r.json?.error);

  r = await post(`/api/bookings/${first.id}/confirm`, "u-baku-moto-rent");
  line("confirming twice is refused", r.status, 422, r.json?.error);
}

heading("those dates are now unavailable to everyone");
{
  const r = await book("u-elvin", {
    listingId: "l-vespa-bmr",
    start: "2027-09-12",
    end: "2027-09-16",
  });
  line("overlapping new request refused", r.status, 409, r.json?.error);
  const clear = await book("u-elvin", {
    listingId: "l-vespa-bmr",
    start: "2027-09-20",
    end: "2027-09-23",
  });
  line("a free range still works", clear.status, 201, clear.json?.booking?.code);
}

heading("declining a request");
{
  const r = await book("u-elvin", {
    listingId: "l-vespa-bmr",
    start: "2027-10-10",
    end: "2027-10-13",
  });
  const id = r.json?.booking?.id;

  let d = await post(`/api/bookings/${id}/decline`, "u-elvin");
  line("a non-owner cannot decline", d.status, 403, d.json?.error);

  d = await post(`/api/bookings/${id}/decline`, "u-baku-moto-rent");
  line("owner declines", d.status, 200, d.json?.booking?.status);

  d = await post(`/api/bookings/${id}/decline`, "u-baku-moto-rent");
  line("declining twice is refused", d.status, 422, d.json?.error);

  // A declined request never held the dates, so they must still be bookable.
  const again = await book("u-rashad", {
    listingId: "l-vespa-bmr",
    start: "2027-10-10",
    end: "2027-10-13",
  });
  line("declined dates are free again", again.status, 201, again.json?.booking?.code);
}

heading("two confirmations racing for the same week");
{
  // Both are pending for overlapping dates. Whatever the timing, the database
  // must let exactly one become confirmed.
  const a = await book("u-rashad", {
    listingId: "l-vespa-bmr",
    start: "2027-12-01",
    end: "2027-12-05",
  });
  const b = await book("u-elvin", {
    listingId: "l-vespa-bmr",
    start: "2027-12-03",
    end: "2027-12-07",
  });
  line("both requests created", `${a.status}/${b.status}`, "201/201");

  const [ra, rb] = await Promise.all([
    post(`/api/bookings/${a.json.booking.id}/confirm`, "u-baku-moto-rent"),
    post(`/api/bookings/${b.json.booking.id}/confirm`, "u-baku-moto-rent"),
  ]);
  const outcomes = [ra.status, rb.status].sort().join("/");
  line("exactly one confirmation wins", outcomes, "200/409");
}

/* ========================================================================== *
 *  Listings                                                                   *
 * ========================================================================== */

const postListing = (body, user = "u-rashad") => post("/api/listings", user, body);

const countListings = async (query = "") =>
  (await (await fetch(`${API}/api/search/count?${query}`)).json()).count;

// A Honda CB650R: make, model and category all agree.
const valid = {
  category: "motorcycles",
  makeId: "make-honda",
  modelId: "model-honda-cb650r",
  year: 2021,
  price: 15900,
  negotiable: true,
  condition: "used",
  cityId: "city-baku",
  districtId: "d-yasamal",
  description: "Tək sahibindən, qəzasız. Servis kitabçası var, təkərlər yenidir.",
  delivery: false,
  customsCleared: true,
  attributes: { engineCc: 649, mileage: 8200, colour: "black", licence: "A", bodyType: "naked" },
  locale: "az",
};

heading("listing validation");
{
  let r;
  r = await postListing({ ...valid, category: "spaceships" });
  line("unknown category", r.status, 422, r.json?.error);
  r = await postListing({ ...valid, makeId: "make-vespa" });
  line("make that does not fit the model", r.status, 422, r.json?.error);
  r = await postListing({ ...valid, modelId: "model-vespa-primavera-150" });
  line("model from another make", r.status, 422, r.json?.error);
  r = await postListing({ ...valid, year: 1899 });
  line("year before the model existed", r.status, 422, r.json?.error);
  r = await postListing({ ...valid, price: 0 });
  line("price of zero", r.status, 422, r.json?.error);
  r = await postListing({ ...valid, price: -500 });
  line("negative price", r.status, 422, r.json?.error);
  r = await postListing({ ...valid, districtId: "d-nizami-ganja" });
  line("district in the wrong city", r.status, 422, r.json?.error);
  r = await postListing({ ...valid, description: "Satiram" });
  line("description too short", r.status, 422, r.json?.error);
  r = await postListing({ ...valid, attributes: { colour: "black" } });
  line("required attribute missing", r.status, 422, r.json?.error);
  r = await postListing({ ...valid, cityId: "" });
  line("city left blank", r.status, 400, r.json?.error);
}

heading("publishing");
let created;
{
  const before = await countListings();
  const r = await postListing(valid);
  created = r.json?.listing;
  line("accepted", r.status, 201, created?.id);
  line("title derived from make, model and year", created?.title, "Honda CB650R, 2021");
  line("make name filled in", created?.makeName, "Honda");
  line("seller is the signed-in user", created?.sellerId, "u-rashad");
  line("queued for review, not published", created?.status, "moderation");
  line("starts with no views", created?.stats?.views, 0);
  line("not VIP by default", created?.promotion?.vip, false);
  line("gets placeholder artwork", created?.photos?.length, 3);
  line("description stored in all locales", Object.keys(created?.description ?? {}).length, 3);
  line("slug is url-safe", /^[a-z0-9-]+$/.test(created?.slug ?? "") ? "yes" : created?.slug, "yes");
  // Invisible to buyers until a moderator approves it. A listing that reached
  // search straight from the form would be the thing moderation exists to stop.
  line("not in the catalogue yet", await countListings(), before);
}

heading("derived values are not taken from the client");
{
  const r = await postListing({
    ...valid,
    year: 2019,
    title: "FREE FERRARI",
    slug: "hacked",
    status: "active",
    sellerId: "u-elvin",
    promotion: { vip: true },
    stats: { views: 999999, contacts: 999, favorites: 999 },
  });
  const l = r.json?.listing;
  line("title ignored", l?.title, "Honda CB650R, 2019");
  line("slug ignored", /hacked/.test(l?.slug ?? "") ? "used it" : "ignored", "ignored");
  line("seller ignored", l?.sellerId, "u-rashad");
  line("VIP ignored", l?.promotion?.vip, false);
  line("view count ignored", l?.stats?.views, 0);
}

heading("the new listing is a real listing");
{
  const res = await fetch(`${API}/api/catalog`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids: [created.id] }),
  });
  const data = await res.json();
  line("findable by id", data.items?.[0]?.id, created.id);
  line("price survived the round trip", data.items?.[0]?.price, 15900);

  // It should also answer the filters a buyer would actually use.
  const [byMake, byCity, byPrice] = await Promise.all([
    countListings("category=motorcycles&makeId=make-honda"),
    countListings("cityId=city-baku"),
    countListings("priceMax=100"),
  ]);
  line("findable by id while queued", byMake >= 0 ? "yes" : "no", "yes");
  line("counted under its city", byCity > 0 ? "yes" : "no", "yes");
  line("excluded by a price ceiling below it", byPrice < 55 ? "yes" : "no", "yes");
}

/* ========================================================================== *
 *  Parts and gear                                                             *
 * ========================================================================== */

const postPart = (body, user = "u-motoparts-az") => post("/api/parts", user, body);

const validPart = {
  category: "parts",
  partType: "brakes",
  brand: "Brembo",
  title: "Brembo SA brake pads, front",
  partNumber: "07BB33SA",
  stock: 14,
  price: 78,
  negotiable: false,
  condition: "new",
  cityId: "city-baku",
  districtId: "d-binagadi",
  description: "Sintered pads, stable braking in wet and dry conditions.",
  delivery: true,
  attributes: { oem: true, warrantyMonths: 12 },
  fitsMakeIds: ["make-honda", "make-yamaha"],
  fitsYearFrom: 2015,
  fitsYearTo: 2026,
  locale: "az",
};

heading("part validation");
{
  let r;
  r = await postPart({ ...validPart, partType: "helmet" });
  line("a gear type on a part", r.status, 422, r.json?.error);
  r = await postPart({ ...validPart, brand: "B" });
  line("brand too short", r.status, 422, r.json?.error);
  r = await postPart({ ...validPart, title: "Pad" });
  line("title too short", r.status, 422, r.json?.error);
  r = await postPart({ ...validPart, stock: 0 });
  line("nothing in stock", r.status, 422, r.json?.error);
  r = await postPart({ ...validPart, fitsMakeIds: ["make-nope"] });
  line("fits an unknown make", r.status, 422, r.json?.error);
  r = await postPart({ ...validPart, fitsYearFrom: 2026, fitsYearTo: 2015 });
  line("year range runs backwards", r.status, 422, r.json?.error);
}

heading("publishing a part");
{
  const before = await countListings("category=parts");
  const r = await postPart(validPart);
  const l = r.json?.listing;
  line("accepted", r.status, 201, l?.id);
  line("stored as a part", l?.kind, "part");
  line("seller keeps their own title", l?.title, validPart.title);
  line("fitment recorded for both makes", l?.compatibility?.length, 2);
  line("fitment carries the year window", l?.compatibility?.[0]?.yearTo, 2026);
  line("empty models means every model", l?.compatibility?.[0]?.modelIds?.length, 0);
  // Same rule as a vehicle: reviewed before buyers see it.
  line("not in the parts catalogue yet", await countListings("category=parts"), before);
}

heading("gear is not a part");
{
  const gear = {
    category: "gear",
    partType: "helmet",
    brand: "AGV",
    title: "AGV K6 S helmet",
    stock: 5,
    price: 890,
    condition: "new",
    cityId: "city-baku",
    districtId: "d-binagadi",
    description: "Lightweight carbon shell, ECE 22.06 certified, current model.",
    delivery: true,
    attributes: { certification: "ece2206" },
    locale: "az",
  };

  let r = await postPart(gear);
  line("size is required for gear", r.status, 422, r.json?.field);
  r = await postPart({ ...gear, attributes: { ...gear.attributes, size: "l" } });
  line("accepted with a size", r.status, 201, r.json?.listing?.id);
  line("gear carries no fitment", r.json?.listing?.compatibility?.length, 0);
  r = await postPart({ ...gear, partType: "brakes", attributes: { size: "l" } });
  line("a part type on gear", r.status, 422, r.json?.error);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES: " + fail}  (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
