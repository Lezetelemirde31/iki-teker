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

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES: " + fail}  (${pass} passed)\n`);
process.exit(fail === 0 ? 0 : 1);
