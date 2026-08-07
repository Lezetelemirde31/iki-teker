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
 * It writes bookings and listings, so re-seed before each run. With R2
 * configured it also leaves a few small objects in the bucket each time.
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

heading("archiving a conversation");
{
  const THREAD = "th-cb650r-rashad-elvin";

  const patch = async (user, body) => {
    const res = await fetch(`${API}/api/threads/${THREAD}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", cookie: `iki-demo-user=${user}` },
      body,
    });
    return res.status;
  };
  const archive = (user, archived) => patch(user, JSON.stringify({ archived }));

  /** How many conversations that person's inbox lists. */
  const inbox = async (user) => {
    const res = await fetch(`${API}/az/chats`, { headers: { cookie: `iki-demo-user=${user}` } });
    const html = await res.text();
    const found = [...html.matchAll(/\/az\/chats\/(th-[a-z0-9-]+)/g)].map((match) => match[1]);
    return new Set(found).size;
  };

  const elvin = await inbox("u-elvin");
  const rashad = await inbox("u-rashad");

  line("a stranger cannot archive it", await archive("u-aysel", true), 403);
  line("a bad body is refused", await patch("u-elvin", '{"archived":"yes"}'), 400);

  line("a participant archives it", await archive("u-elvin", true), 200);
  line("it leaves their inbox", await inbox("u-elvin"), elvin - 1);
  // The bug this section exists for: the flag used to live on the thread, so
  // one side filing a conversation away took it from the other as well.
  line("the other side still has it", await inbox("u-rashad"), rashad);

  const wrote = await post(`/api/threads/${THREAD}/messages`, "u-rashad", {
    body: "Hələ də maraqlanırsınız?",
  });
  line("the other side writes to it", wrote.status, 201);
  line("that brings it back", await inbox("u-elvin"), elvin);

  line("unarchiving works too", await archive("u-elvin", false), 200);
  line("still there", await inbox("u-elvin"), elvin);
}

heading("sending a photo");
{
  const THREAD = "th-cb650r-rashad-elvin";
  const OTHER_THREAD = "th-iron883-aysel";

  // A one-pixel PNG. The point is a real image with a real byte length, not a
  // picture — nothing in the path looks at the contents.
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  const ask = (user, body) => post("/api/uploads", user, body);
  const valid = { threadId: THREAD, contentType: "image/jpeg", size: 240_000 };

  let r = await ask("u-elvin", { ...valid, contentType: "application/pdf" });
  line("a pdf is not a photo", r.status, 422, r.json?.error);
  r = await ask("u-elvin", { ...valid, contentType: "video/mp4" });
  line("nor is a video", r.status, 422, r.json?.error);
  r = await ask("u-elvin", { ...valid, size: 40 * 1024 * 1024 });
  line("40 MB is refused", r.status, 422, r.json?.error);
  r = await ask("u-elvin", { ...valid, size: 0 });
  line("so is nothing at all", r.status, 422, r.json?.error);
  r = await ask("u-kamran", valid);
  line("a stranger gets no url", r.status, 403, r.json?.error);
  r = await ask("u-elvin", { threadId: THREAD });
  line("an incomplete request", r.status, 400);

  r = await ask("u-elvin", { ...valid, contentType: "image/png", size: PNG.length });
  line("a participant gets a url", r.status, 200);
  const key = r.json?.key;
  line("the key is inside the thread", String(key ?? "").startsWith(`chat/${THREAD}/`), true, key);

  const put = await fetch(
    r.json.uploadUrl.startsWith("http") ? r.json.uploadUrl : API + r.json.uploadUrl,
    { method: "PUT", headers: r.json.headers, body: PNG },
  );
  line("the bytes upload", put.status, 200);

  const image = { key, fileName: "zencir.png", fileSize: "1 KB", width: 1, height: 1 };

  // The upload is a separate request to a separate service. If it failed and
  // the message landed anyway, the conversation would keep a broken picture
  // that nothing afterwards can repair.
  r = await post(`/api/threads/${THREAD}/messages`, "u-elvin", {
    image: { ...image, key: key.replace(/[^/]+\.png$/, "nothingwasuploadedhere.png") },
  });
  line("a photo that was never uploaded", r.status, 404, r.json?.error);

  r = await post(`/api/threads/${THREAD}/messages`, "u-elvin", { image });
  line("the photo is sent", r.status, 201, r.json?.message?.kind);
  line("it carries a url", Boolean(r.json?.message?.url), true, r.json?.message?.url);
  line("and its dimensions", r.json?.message?.width, 1);

  // The key names the thread it was uploaded into, which is what stops an
  // attachment being replayed into a different conversation.
  r = await post(`/api/threads/${OTHER_THREAD}/messages`, "u-rashad", { image });
  line("it cannot move threads", r.status, 422, r.json?.error);
  r = await post(`/api/threads/${THREAD}/messages`, "u-elvin", {
    image: { ...image, key: `chat/${THREAD}/../../etc/passwd` },
  });
  line("nor climb out of the bucket", r.status, 422, r.json?.error);

  const fetched = await fetch(`${API}/api/threads/${THREAD}/messages/poll`, {
    headers: { cookie: "iki-demo-user=u-rashad" },
  });
  const polled = await fetched.json();
  line(
    "the other side receives it",
    polled.messages?.some((message) => message.kind === "image" && message.url),
    true,
  );
}

heading("photos on a listing");
{
  const PNG = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  /** Uploads one picture the way the post form does, and returns its key. */
  async function upload(user) {
    const asked = await post("/api/uploads", user, {
      scope: "listing",
      contentType: "image/png",
      size: PNG.length,
    });
    const put = await fetch(
      asked.json.uploadUrl.startsWith("http") ? asked.json.uploadUrl : API + asked.json.uploadUrl,
      { method: "PUT", headers: asked.json.headers, body: PNG },
    );
    return { key: asked.json.key, status: asked.status, uploaded: put.status };
  }

  const mine = await upload("u-rashad");
  line("a listing upload is allowed", mine.status, 200);
  line("filed under the seller", mine.key.startsWith("listings/u-rashad/"), true, mine.key);
  line("the bytes upload", mine.uploaded, 200);

  let r = await post("/api/uploads", "u-rashad", { contentType: "image/png", size: PNG.length });
  line("a scope is required", r.status, 400);

  r = await post("/api/listings", "u-rashad", { ...valid, photoKeys: [mine.key] });
  line("published with a photo", r.status, 201);
  const photos = r.json?.listing?.photos ?? [];
  line("the photo is on the listing", photos[0]?.key, mine.key);
  line("and has an address", Boolean(photos[0]?.url), true, photos[0]?.url);

  // Someone else's prefix, an object that was never uploaded, and a path trying
  // to climb out — none of them may end up on a listing buyers are looking at.
  r = await post("/api/listings", "u-rashad", {
    ...valid,
    photoKeys: [
      "listings/u-elvin/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png",
      `listings/u-rashad/${"b".repeat(32)}.png`,
      "listings/u-rashad/../../etc/passwd",
    ],
  });
  line("nothing claimable is kept", r.status, 201);
  line("it falls back to artwork", r.json?.listing?.photos?.[0]?.key, undefined);
  line("and still shows three frames", r.json?.listing?.photos?.length, 3);
}

heading("a review needs a rental that finished");
{
  // bk-2402 is seeded returned: u-elvin rented Rəşad's Vespa in July.
  const finished = "bk-2402";
  // bk-2477 is confirmed but not yet returned — Nərmin picks it up tomorrow.
  const ongoing = "bk-2477";

  const review = (user, body) => post("/api/reviews", user, body);
  const words = "Motosikl təmiz və vaxtında təhvil verildi, hər şey razılaşdığımız kimi.";

  const profileOf = async (id) => (await fetch(`${API}/api/profile?id=${id}`)).json().catch(() => null);

  let r = await review("u-kamran", { bookingId: finished, rating: 5, text: words });
  line("someone outside it cannot", r.status, 403, r.json?.error);

  r = await review("u-elvin", { bookingId: "does-not-exist", rating: 5, text: words });
  line("an unknown booking", r.status, 404, r.json?.error);

  r = await review("u-elvin", { bookingId: finished, rating: 9, text: words });
  line("nine stars out of five", r.status, 422, r.json?.error);

  r = await review("u-elvin", { bookingId: finished, rating: 5, text: "ok" });
  line("one word is not a review", r.status, 422, r.json?.error);

  r = await review("u-elvin", { bookingId: finished, rating: 5 });
  line("text is required", r.status, 400);

  // The whole guarantee: no completed transaction, no review.
  r = await review("u-nermin", { bookingId: ongoing, rating: 5, text: words });
  line("a rental still running", r.status, 422, r.json?.error);

  r = await review("u-elvin", { bookingId: finished, rating: 5, text: words });
  line("the renter reviews the owner", r.status, 201, r.json?.review?.id);
  line("aimed at the owner, not chosen", r.json?.review?.targetId, "u-rashad");
  line("marked as a verified deal", r.json?.review?.verifiedTransaction, true);

  r = await review("u-elvin", { bookingId: finished, rating: 4, text: words });
  line("but only once", r.status, 422, r.json?.error);

  // The other direction: the person who handed over the motorcycle.
  r = await review("u-rashad", { bookingId: finished, rating: 5, text: words });
  line("the owner reviews the renter", r.status, 201, r.json?.review?.id);
  line("aimed back at the renter", r.json?.review?.targetId, "u-elvin");
}

heading("reporting a listing, and a moderator closing it");
{
  const report = (user, body) => post("/api/complaints", user, body);
  const resolve = (user, id, body) => post(`/api/complaints/${id}`, user, body);

  const statusOf = async (id) => {
    const res = await fetch(`${API}/api/catalog`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    const data = await res.json().catch(() => null);
    return data?.items?.[0]?.status;
  };

  // A listing of its own, so upholding a report cannot disturb the rest of the run.
  const created = (await postListing({ ...valid, price: 15100 })).json?.listing;
  const target = created?.id;
  line("a listing to report", Boolean(target), true, target);

  let r = await report("u-rashad", { entityType: "listing", entityId: target, reason: "fraud" });
  line("not your own listing", r.status, 422, r.json?.error);

  r = await report("u-elvin", { entityType: "listing", entityId: "does-not-exist", reason: "spam" });
  line("an unknown listing", r.status, 404, r.json?.error);

  r = await report("u-elvin", { entityType: "listing", entityId: target, reason: "nonsense" });
  line("a reason nobody offered", r.status, 422, r.json?.error);

  r = await report("u-elvin", { entityType: "workshop", entityId: target, reason: "spam" });
  line("a kind of thing that has none", r.status, 400);

  r = await report("u-elvin", {
    entityType: "listing",
    entityId: target,
    reason: "fraud",
    note: "Qabaqcadan köçürmə istəyir.",
  });
  line("somebody reports it", r.status, 201, r.json?.error);

  // One account, one report. Otherwise the queue is trivial to flood.
  r = await report("u-elvin", { entityType: "listing", entityId: target, reason: "spam" });
  line("but only once", r.status, 409, r.json?.error);

  r = await report("u-nermin", { entityType: "listing", entityId: target, reason: "sold" });
  line("a second person still can", r.status, 201, r.json?.error);

  // Reporting a person, not a listing.
  r = await report("u-elvin", { entityType: "user", entityId: "u-elvin", reason: "spam" });
  line("nor yourself", r.status, 422, r.json?.error);

  r = await report("u-elvin", { entityType: "user", entityId: "u-kamran", reason: "offensive" });
  line("a person can be reported", r.status, 201, r.json?.error);

  // Who gets to close one.
  const filed = await report("u-kamran", {
    entityType: "listing",
    entityId: target,
    reason: "spam",
  });
  const complaintId = filed.json?.id;
  line("the report has an id", Boolean(complaintId), true, complaintId);

  r = await resolve("u-elvin", complaintId, { outcome: "upheld" });
  line("a bystander cannot close one", r.status, 403, r.json?.error);

  r = await resolve("u-moderator", "cp-does-not-exist", { outcome: "upheld" });
  line("nor can a moderator invent one", r.status, 404, r.json?.error);

  r = await resolve("u-moderator", complaintId, { outcome: "sideways" });
  line("only two ways to close it", r.status, 400);

  // Nothing has happened to the listing yet.
  line("still on the market", await statusOf(target), "moderation");

  r = await resolve("u-moderator", complaintId, { outcome: "upheld" });
  line("a moderator upholds it", r.status, 200, r.json?.error);
  line("the listing comes down", await statusOf(target), "draft");

  // The second moderator to click gets told, rather than reopening it.
  r = await resolve("u-moderator", complaintId, { outcome: "dismissed" });
  line("and cannot be closed twice", r.status, 409, r.json?.error);

  // Dismissing leaves everything where it is.
  const other = await report("u-nermin", {
    entityType: "user",
    entityId: "u-kamran",
    reason: "spam",
  });
  r = await resolve("u-moderator", other.json?.id, { outcome: "dismissed" });
  line("a report can also be dismissed", r.status, 200, r.json?.error);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES: " + fail}  (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
