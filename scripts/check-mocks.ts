/* Referential-integrity check across the seeded datasets. */
import {
  bookings,
  cities,
  districts,
  listings,
  makes,
  models,
  moderationQueue,
  notifications,
  parts,
  rentalOffers,
  reviews,
  serviceItems,
  chatThreads,
  users,
  workshops,
  monthlyIncome,
  adminMetrics,
} from "@/mocks";
import { quote } from "@/lib/queries";
import { offerById } from "@/mocks/rentals";

const errors: string[] = [];
const warn = (message: string) => errors.push(message);

const userIds = new Set(users.map((u) => u.id));
const cityIds = new Set(cities.map((c) => c.id));
const districtIds = new Set(districts.map((d) => d.id));
const makeIds = new Set(makes.map((m) => m.id));
const modelIds = new Set(models.map((m) => m.id));
const listingIds = new Set(listings.map((l) => l.id));
const offerIds = new Set(rentalOffers.map((o) => o.id));
const workshopIds = new Set(workshops.map((w) => w.id));

for (const l of listings) {
  if (!userIds.has(l.sellerId)) warn(`listing ${l.id}: unknown seller ${l.sellerId}`);
  if (l.cityId && !cityIds.has(l.cityId)) warn(`listing ${l.id}: unknown city ${l.cityId}`);
  // A district is optional now; naming one that does not exist is still wrong.
  if (l.districtId && !districtIds.has(l.districtId))
    warn(`listing ${l.id}: unknown district ${l.districtId}`);
  if (!makeIds.has(l.makeId)) warn(`listing ${l.id}: unknown make ${l.makeId}`);
  if (!modelIds.has(l.modelId)) warn(`listing ${l.id}: unknown model ${l.modelId}`);
  if (l.rentalOfferId && !offerIds.has(l.rentalOfferId))
    warn(`listing ${l.id}: unknown offer ${l.rentalOfferId}`);
  if (l.photos.length === 0) warn(`listing ${l.id}: no photos`);
  const district = districts.find((d) => d.id === l.districtId);
  if (district && district.cityId !== l.cityId)
    warn(`listing ${l.id}: district ${l.districtId} is not in city ${l.cityId}`);
}

for (const p of parts) {
  if (!userIds.has(p.sellerId)) warn(`part ${p.id}: unknown seller ${p.sellerId}`);
  if (p.cityId && !cityIds.has(p.cityId)) warn(`part ${p.id}: unknown city ${p.cityId}`);
  if (p.districtId && !districtIds.has(p.districtId))
    warn(`part ${p.id}: unknown district ${p.districtId}`);
  for (const c of p.compatibility) {
    if (!makeIds.has(c.makeId)) warn(`part ${p.id}: unknown compat make ${c.makeId}`);
    for (const m of c.modelIds) if (!modelIds.has(m)) warn(`part ${p.id}: unknown compat model ${m}`);
  }
}

for (const o of rentalOffers) {
  if (!listingIds.has(o.listingId)) warn(`offer ${o.id}: unknown listing ${o.listingId}`);
  if (!userIds.has(o.ownerId)) warn(`offer ${o.id}: unknown owner ${o.ownerId}`);
  const listing = listings.find((l) => l.id === o.listingId);
  if (listing && listing.rentalOfferId !== o.id)
    warn(`offer ${o.id}: listing ${o.listingId} does not link back`);
  if (listing && listing.sellerId !== o.ownerId)
    warn(`offer ${o.id}: owner ${o.ownerId} != listing seller ${listing.sellerId}`);
}

for (const b of bookings) {
  if (!offerIds.has(b.offerId)) warn(`booking ${b.id}: unknown offer ${b.offerId}`);
  if (!listingIds.has(b.listingId)) warn(`booking ${b.id}: unknown listing ${b.listingId}`);
  if (!userIds.has(b.renterId)) warn(`booking ${b.id}: unknown renter ${b.renterId}`);
  if (!userIds.has(b.ownerId)) warn(`booking ${b.id}: unknown owner ${b.ownerId}`);
  if (b.subtotal !== b.dayPrice * b.days)
    warn(`booking ${b.id}: subtotal ${b.subtotal} != ${b.dayPrice} x ${b.days}`);
  if (b.total !== b.subtotal + b.serviceFee + b.deposit)
    warn(`booking ${b.id}: total ${b.total} != subtotal+fee+deposit`);
  const offer = offerById.get(b.offerId);
  if (offer) {
    const expected = Math.round(b.subtotal * offer.commissionRate * 100) / 100;
    if (Math.abs(expected - b.commission) > 0.01)
      warn(`booking ${b.id}: commission ${b.commission} != expected ${expected}`);
  }
}

// Confirmed/active bookings must be reflected in the owner's blocked dates.
for (const b of bookings) {
  if (b.status !== "confirmed" && b.status !== "active") continue;
  const offer = offerById.get(b.offerId);
  if (!offer) continue;
  if (!offer.blockedDates.includes(b.start))
    warn(`booking ${b.id} (${b.status}): start ${b.start} not blocked on ${offer.id}`);
}

for (const w of workshops) {
  if (!userIds.has(w.ownerId)) warn(`workshop ${w.id}: unknown owner ${w.ownerId}`);
  if (w.services.length === 0) warn(`workshop ${w.id}: no services attached`);
}
for (const s of serviceItems) {
  if (!workshopIds.has(s.workshopId)) warn(`service ${s.id}: unknown workshop ${s.workshopId}`);
}

for (const r of reviews) {
  if (!userIds.has(r.authorId)) warn(`review ${r.id}: unknown author ${r.authorId}`);
  if (!userIds.has(r.targetId)) warn(`review ${r.id}: unknown target ${r.targetId}`);
}

for (const t of chatThreads) {
  for (const p of t.participantIds) if (!userIds.has(p)) warn(`thread ${t.id}: unknown participant ${p}`);
  for (const m of t.messages) {
    if (!userIds.has(m.authorId)) warn(`thread ${t.id}: unknown message author ${m.authorId}`);
    if (m.kind === "text" && !m.body) warn(`thread ${t.id}: empty text message ${m.id}`);
  }
  const unread = t.messages.filter((m) => !m.readByRecipient).length;
  if (unread !== t.unreadCount) warn(`thread ${t.id}: unreadCount ${t.unreadCount} != ${unread}`);
}

for (const m of moderationQueue) {
  if (!userIds.has(m.sellerId)) warn(`moderation ${m.id}: unknown seller ${m.sellerId}`);
  if (!cityIds.has(m.cityId)) warn(`moderation ${m.id}: unknown city ${m.cityId}`);
}

for (const n of notifications) {
  for (const k of ["az", "en", "ru"] as const) {
    if (!n.title[k]) warn(`notification ${n.id}: missing ${k} title`);
    if (!n.body[k]) warn(`notification ${n.id}: missing ${k} body`);
  }
}

// Trilingual completeness on every listing/part description.
for (const item of [...listings, ...parts]) {
  for (const k of ["az", "en", "ru"] as const) {
    if (!item.description[k]) warn(`${item.id}: missing ${k} description`);
  }
}

// Headline numbers the prototype asserts.
const july = monthlyIncome("u-rashad", "2026-07");
if (july !== 640) warn(`Rəşad July income is ${july}, expected 640`);

const heroOffer = offerById.get("offer-vespa-bmr")!;
const q = quote(heroOffer, "2026-08-08", "2026-08-12");
if (q.days !== 4) warn(`hero quote days ${q.days} != 4`);
if (q.subtotal !== 180) warn(`hero quote subtotal ${q.subtotal} != 180`);
if (q.total !== 380) warn(`hero quote total ${q.total} != 380`);

if (adminMetrics.pendingModeration !== 14)
  warn(`pendingModeration ${adminMetrics.pendingModeration} != 14`);

console.log("listings          ", listings.length);
console.log("  rentable        ", rentalOffers.length);
console.log("parts + gear      ", parts.length);
console.log("users             ", users.length);
console.log("workshops/services", workshops.length, "/", serviceItems.length);
console.log("bookings          ", bookings.length);
console.log("chat threads      ", chatThreads.length);
console.log("makes / models    ", makes.length, "/", models.length);
console.log("cities / districts", cities.length, "/", districts.length);
console.log("moderation queue  ", moderationQueue.length);
console.log("July revenue      ", adminMetrics.monthlyRevenue);
console.log("Rəşad July income ", july);
console.log("hero quote        ", JSON.stringify(q));
console.log("");

if (errors.length) {
  console.log(`FAILED — ${errors.length} problem(s):`);
  for (const e of errors) console.log("  ✗", e);
  process.exit(1);
}
console.log("OK — referential integrity clean");
