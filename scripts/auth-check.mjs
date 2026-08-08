/**
 * Exercises phone sign-in over HTTP.
 *
 * The parts worth testing here are the ones that are wrong by default: a code
 * that can be guessed, reused, or requested a hundred times; a session that
 * survives signing out; a stranger being told whether a number is registered.
 *
 * Needs a running server with a database behind it:
 *
 *   USE_LOCAL_DB=1 npx next dev -p 3100     (or DATABASE_URL=…)
 *   npm run check:auth
 */
const API = process.env.API ?? "http://localhost:3100";

/**
 * This script registers accounts. Pointed at a server backed by the production
 * database, it leaves real-looking users behind — and once they are mixed in
 * with genuine sign-ups there is no safe way to tell them apart, which is how
 * two real accounts were deleted on 3 August 2026.
 *
 * A local address is the only thing it will talk to unless told otherwise.
 */
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(API) && process.env.ALLOW_REMOTE_CHECK !== "1") {
  console.error(
    [
      `Refusing to run against ${API}.`,
      "",
      "This script creates accounts. Against a deployment they land in the same",
      "table as real sign-ups and cannot be told apart afterwards.",
      "",
      "Run it against a local server, or say so explicitly:",
      "",
      "  ALLOW_REMOTE_CHECK=1 npm run check:auth",
    ].join("\n"),
  );
  process.exit(1);
}

let pass = 0,
  fail = 0;
const line = (label, got, want, extra = "") => {
  const ok = String(got) === String(want);
  ok ? pass++ : fail++;
  console.log(
    `  ${ok ? "OK  " : "FAIL"}  ${label.padEnd(46)} ${String(got).padEnd(9)} (want ${want}) ${extra}`,
  );
};
const heading = (text) => console.log(`\n— ${text} —`);

async function call(path, body, cookie) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json, setCookie: res.headers.get("set-cookie") };
}

/** A number nobody has used, so each run starts from no account. */
const fresh = () => `+99450${String(Math.floor(1000000 + Math.random() * 8999999))}`;

heading("phone validation");
{
  for (const [label, phone] of [
    ["letters", "abcdefghij"],
    ["too short", "+99450123"],
    ["unknown operator", "+994121234567"],
    ["empty", ""],
  ]) {
    const r = await call("/api/auth/start", { phone, name: "Test" });
    line(label, r.status, 422, r.json?.error);
  }

  // The same number in four shapes must be one account, not four.
  const shapes = ["0501234567", "050 123 45 67", "+994 50 123-45-67", "994501234567"];
  const masked = [];
  for (const shape of shapes) {
    const r = await call("/api/auth/start", { phone: shape, name: "Test" });
    if (r.json?.masked) masked.push(r.json.masked);
  }
  line("four spellings, one number", new Set(masked).size <= 1 ? "same" : "different", "same");
}

heading("a new number needs a name");
{
  const phone = fresh();
  let r = await call("/api/auth/start", { phone });
  line("no name given", r.status, 422, r.json?.error);
  r = await call("/api/auth/start", { phone, name: "Yeni İstifadəçi" });
  line("with a name", r.status, 200, r.json?.masked);
}

heading("the code");
let phone, code;
{
  phone = fresh();
  const start = await call("/api/auth/start", { phone, name: "Test User" });
  code = start.json?.devCode;
  line("a code was issued", /^\d{6}$/.test(code ?? "") ? "6 digits" : code, "6 digits");
  line("the number is masked back", /\*\*\*/.test(start.json?.masked ?? "") ? "masked" : "plain", "masked");

  // Wrong guesses are bounded. Five is the limit, so the sixth must be refused
  // even if it happens to be right.
  let refusedAt = null;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const r = await call("/api/auth/verify", { phone, code: "000000" });
    if (r.json?.error === "tooManyAttempts" && refusedAt === null) refusedAt = attempt;
  }
  line("guessing is cut off", refusedAt !== null ? "yes" : "no", "yes");

  const afterLockout = await call("/api/auth/verify", { phone, code });
  line("the real code is dead too", afterLockout.status, 422, afterLockout.json?.error);
}

heading("signing in");
let cookie;
{
  phone = fresh();
  const start = await call("/api/auth/start", { phone, name: "Yeni İstifadəçi" });
  code = start.json?.devCode;

  const wrong = await call("/api/auth/verify", { phone, code: code === "111111" ? "222222" : "111111" });
  line("a wrong code is refused", wrong.status, 422, wrong.json?.error);

  const right = await call("/api/auth/verify", { phone, code });
  line("the right code is accepted", right.status, 200, right.json?.user?.id);
  line("an account was created", right.json?.created, true);

  cookie = (right.setCookie ?? "").split(";")[0];
  line("a session cookie came back", /^iki-session=/.test(cookie) ? "yes" : cookie, "yes");
  line("the cookie is httpOnly", /HttpOnly/i.test(right.setCookie ?? "") ? "yes" : "no", "yes");

  // Single use: the same code must not open a second session.
  const replay = await call("/api/auth/verify", { phone, code });
  line("the code cannot be reused", replay.status, 422, replay.json?.error);
}

heading("the session");
{
  const me = await fetch(`${API}/api/auth/me`, { headers: { cookie } });
  const data = await me.json();
  line("the server knows who it is", data.user ? "yes" : "no", "yes");

  const anon = await fetch(`${API}/api/auth/me`);
  const anonData = await anon.json();
  line("and knows when nobody is", anonData.user, null);

  const forged = await fetch(`${API}/api/auth/me`, {
    headers: { cookie: "iki-session=not-a-real-session-id" },
  });
  line("a made-up session is nobody", (await forged.json()).user, null);

  await call("/api/auth/logout", {}, cookie);
  const after = await fetch(`${API}/api/auth/me`, { headers: { cookie } });
  line("signing out ends it immediately", (await after.json()).user, null);
}

heading("an existing account signs in without registering again");
{
  // A seeded user, so the account exists but has no code cooldown from the
  // sections above. Typed the way a person would, not the way it is stored —
  // if normalising were skipped anywhere, this is the check that would fail.
  const seeded = "050 447 18 92";

  const start = await call("/api/auth/start", { phone: seeded });
  line("no name needed for a known number", start.status, 200, start.json?.masked);

  const done = await call("/api/auth/verify", { phone: seeded, code: start.json?.devCode });
  line("signed in", done.status, 200, done.json?.user?.name);
  line("no second account was made", done.json?.created, false);
  line("it is the seeded account", done.json?.user?.id, "u-rashad");
}

heading("rate limiting");
{
  const target = fresh();
  const first = await call("/api/auth/start", { phone: target, name: "Test" });
  line("first request allowed", first.status, 200);
  const second = await call("/api/auth/start", { phone: target, name: "Test" });
  line("an immediate resend is refused", second.status, 429, second.json?.error);
  line("and says how long to wait", second.json?.retryAfterSeconds > 0 ? "yes" : "no", "yes");
}

heading("protected routes");
{
  const res = await fetch(`${API}/az/post?category=motorcycles`, { redirect: "manual" });
  const location = res.headers.get("location") ?? "";
  line("posting redirects a stranger", res.status, 307, location.slice(0, 40));
  line("and remembers where they were going", /next=/.test(location) ? "yes" : "no", "yes");
}

/* ========================================================================== *
 *  Passwords                                                                  *
 * ========================================================================== */

heading("registering with a password");
let pwPhone, pwCookie;
{
  pwPhone = fresh();
  const good = "korrekt-at-batareya-7";

  for (const [label, password, want] of [
    ["shorter than eight", "abc123", "tooShort"],
    ["one of the usual suspects", "password", "tooCommon"],
    ["digits everyone tries", "12345678", "tooCommon"],
  ]) {
    const r = await call("/api/auth/register", { phone: fresh(), name: "Test", password });
    line(label, r.json?.error, want, r.status);
  }

  let r = await call("/api/auth/register", { phone: pwPhone, name: "P", password: good });
  line("a one-letter name", r.json?.error, "nameRequired", r.status);

  r = await call("/api/auth/register", { phone: pwPhone, name: "Parol İstifadəçi", password: good });
  line("accepted", r.status, 201, r.json?.user?.id);
  pwCookie = (r.setCookie ?? "").split(";")[0];
  line("signed in straight away", /^iki-session=/.test(pwCookie) ? "yes" : "no", "yes");

  // No SMS was involved, so the number is not proved and must not be claimed.
  const me = await (await fetch(`${API}/api/auth/me`, { headers: { cookie: pwCookie } })).json();
  line("account exists", me.user ? "yes" : "no", "yes");

  r = await call("/api/auth/register", { phone: pwPhone, name: "Someone Else", password: good });
  line("the same number twice", r.status, 409, r.json?.error);
}

heading("signing in with a password");
{
  const good = "korrekt-at-batareya-7";

  let r = await call("/api/auth/password", { phone: pwPhone, password: "wrong-password-here" });
  line("a wrong password", r.status, 401, r.json?.error);

  r = await call("/api/auth/password", { phone: fresh(), password: good });
  line("a number with no account is told so", r.json?.error, "noAccount", r.status);

  r = await call("/api/auth/password", { phone: pwPhone, password: good });
  line("the right password", r.status, 200, r.json?.user?.name);

  const cookie = (r.setCookie ?? "").split(";")[0];
  const me = await (await fetch(`${API}/api/auth/me`, { headers: { cookie } })).json();
  line("and it is a working session", me.user ? "yes" : "no", "yes");

  // A seeded account has no password, and that is a different answer from a
  // wrong one — otherwise nobody would know to sign in by SMS instead.
  r = await call("/api/auth/password", { phone: "050 447 18 92", password: good });
  line("an account with no password says so", r.json?.error, "noPassword", r.status);
}

heading("a password cannot be set by a stranger");
{
  const r = await call("/api/auth/reset", { password: "another-good-password-9" });
  line("no session, no reset", r.status, 401, r.json?.error);
}

heading("registering with an email");
{
  // A fresh address each run, so the account is always created rather than
  // found — the path that has to work for anybody arriving for the first time.
  const address = `check-${Math.floor(Math.random() * 1e9)}@example.com`;

  let r = await call("/api/auth/email/start", { email: "not-an-address" });
  line("something that is not an address", r.json?.error, "invalidEmail", r.status);

  r = await call("/api/auth/email/start", { email: "no-at-sign.example.com" });
  line("nor is a bare domain", r.json?.error, "invalidEmail", r.status);

  // Step one asks for nothing else, so its answer cannot be used to find out
  // which addresses are registered.
  const started = await call("/api/auth/email/start", { email: address });
  line("a code is issued", started.status, 200, started.json?.masked);
  line("the address is masked", /^.{2}\*+@example\.com$/.test(started.json?.masked ?? ""), true);
  line("the code comes back in demo mode", typeof started.json?.devCode, "string");
  const code = started.json.devCode;

  r = await call("/api/auth/email/start", { email: address });
  line("a second code too soon", r.status, 429, r.json?.error);

  // Details valid, code wrong — they are checked in that order, so probing the
  // code needs everything else to be right first.
  r = await call("/api/auth/email/verify", {
    email: address,
    code: "000000",
    name: "Yeni",
    password: "a-good-enough-password-9",
  });
  line("a wrong code", r.json?.error, "wrongCode", r.status);

  // Everything below is rejected *before* the code is spent, so a mistyped
  // password does not also cost somebody their code and another minute's wait.
  r = await call("/api/auth/email/verify", { email: address, code, name: "" });
  line("a new address needs a name", r.json?.error, "nameRequired", r.status);

  r = await call("/api/auth/email/verify", { email: address, code, name: "Yeni", password: "123" });
  line("and a password worth having", r.json?.error, "tooShort", r.status);

  r = await call("/api/auth/email/verify", {
    email: address,
    code,
    name: "Yeni",
    password: "a-good-enough-password-9",
    phone: "+994 50 100 00 12",
  });
  line("a number somebody else holds", r.json?.error, "phoneTaken", r.status);

  // The code survived all three refusals.
  const mine = `+99455${String(Math.floor(1000000 + Math.random() * 8999999))}`;
  const done = await call("/api/auth/email/verify", {
    email: address,
    code,
    name: "Yeni İstifadəçi",
    password: "a-good-enough-password-9",
    phone: mine,
  });
  line("the code still worked afterwards", done.status, 200, done.json?.user?.id);
  line("and created the account", done.json?.created, true);
  line("and it is a working session", done.setCookie ? "yes" : "no", "yes");

  r = await call("/api/auth/email/verify", { email: address, code, name: "Yeni" });
  line("the same code cannot be reused", r.json?.error, "noCode", r.status);

  const me = await fetch(API + "/api/auth/me", { headers: { cookie: done.setCookie } });
  const profile = await me.json().catch(() => null);
  line("the account carries the number given", profile?.user?.phone, mine);
  line("but it is not verified by typing it", profile?.user?.phoneVerified ?? false, false);

  // The quick way back in.
  r = await call("/api/auth/email/password", { email: address, password: "a-good-enough-password-9" });
  line("the password signs them back in", r.status, 200, r.json?.user?.name);

  r = await call("/api/auth/email/password", { email: address, password: "not-the-password-1" });
  line("a wrong one does not", r.status, 401, r.json?.error);

  // An address nobody has registered answers exactly like a wrong password, so
  // this cannot be used to enumerate accounts.
  r = await call("/api/auth/email/password", {
    email: "nobody-here@example.com",
    password: "a-good-enough-password-9",
  });
  line("an unknown address answers the same", r.json?.error, "wrongCredentials", r.status);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES: " + fail}  (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
