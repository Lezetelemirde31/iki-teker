/**
 * Exercises the booking API over HTTP.
 *
 * db-check proves the database refuses a double booking; this proves the whole
 * path does — validation, server-side pricing, ownership, and the race where
 * two confirmations for the same week arrive at once.
 *
 * Needs a running server with a database behind it:
 *
 *   npm run db:seed
 *   USE_LOCAL_DB=1 npx next dev -p 3100
 *   npm run check:api
 *
 * It writes bookings, so re-seed before each run.
 */
const API = process.env.API ?? "http://localhost:3100";
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

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES: " + fail}  (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
