# Iki Tekerli — Engineering Handoff

**Single source of truth for any agent or developer continuing this project.**

Last updated: 6 August 2026 · Live at <https://ikitekerli.az> · Repo: `github.com/Lezetelemirde31/iki-teker`

Read this document before reading code. It records not only what exists but *why* it was built that way, which is the part the repository cannot tell you.

---

## 1. Project Overview

### What this is

**Iki Tekerli** is a two-wheeler marketplace for Azerbaijan. It covers the whole lifecycle of a motorcycle, scooter, e-bike or bicycle in one product:

- **Buy and sell** — classified listings for vehicles, spare parts and gear
- **Rent** — peer-to-peer and commercial vehicle rental with a real booking engine
- **Service** — a directory of workshops (data modelled, UI minimal)

It originates from a client pitch deck and commercial proposal (both in Azerbaijani/Russian, translated in `docs/Iki-Tekerli_PRD_EN.md`). That PRD is the product specification; this document is the engineering state.

### Main goal

Replace the current reality — two-wheeler trade happening in Facebook groups and Instagram DMs, with no price history, no trust signals and no dispute record — with a structured marketplace where a rental booking is a real, enforceable transaction.

The single strongest product claim is **double booking is impossible**. That is not an application-level check; it is enforced by a Postgres exclusion constraint. Everything else in the rental flow is built around that guarantee.

### Target users

| User | What they do |
|---|---|
| **Private seller** | Lists a motorcycle they own, answers buyers, marks it sold |
| **Dealer / shop** | Multiple listings, parts inventory, higher volume |
| **Rental operator** | Lists vehicles for hire, manages a calendar, confirms or declines requests |
| **Buyer / renter** | Searches, filters, saves favourites, messages sellers, books rentals |
| **Workshop** | Listed in the service directory (data exists, UI not built) |
| **Moderator / admin** | Reviews queued listings and handles reports about listings and people |

### Current development stage

**Working product with real persistence, no authentication.**

- The demo the client approved is complete: 12 screens, three languages, mobile-only
- A hosted Postgres (Neon) is attached and live; listings, bookings and messages persist
- Write paths exist for: publishing a listing, requesting/confirming/declining a booking, sending a message, managing your own listing
- **There is no sign-in.** Identity is a demo persona resolved from a cookie. This is the single largest gap and it blocks anything user-specific from being trustworthy.

---

## 2. Tech Stack

### Frameworks and libraries

| Concern | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15**, App Router | Server Components by default |
| UI | **React 19** | |
| Language | **TypeScript**, strict + `noUncheckedIndexedAccess` | Indexing an array yields `T \| undefined`; this is deliberate |
| Styling | **Tailwind CSS v4** | `@theme inline`, `@utility`, `@custom-variant dark` — no `tailwind.config.js` |
| Components | Hand-written, shadcn-shaped | Radix primitives are installed; most UI is bespoke |
| Icons | **lucide-react** | |
| Animation | **framer-motion** | Page transitions only |
| Carousel | **embla-carousel-react** | Listing gallery |
| Client state | **zustand** with `persist` | Favourites and preferences only |
| ORM | **Drizzle** | |
| Database | **Postgres** — Neon in production, **PGlite** (WASM) for local dev | Same engine; PGlite needs no Docker or account |
| Theming | **next-themes** | |
| Fonts | **Inter** (body) + **Manrope** (display) | via `next/font` |
| i18n | **Custom, ~120 lines** | No next-intl. See §12 |

### Folder structure

```
src/
├── app/
│   ├── layout.tsx                    Root shell, fonts, theme provider
│   ├── [locale]/
│   │   ├── layout.tsx                Locale provider, metadata, hreflang
│   │   ├── page.tsx                  Splash
│   │   ├── onboarding/               3-step intro
│   │   ├── install/                  PWA install instructions
│   │   └── (app)/                    Screens inside the device shell
│   │       ├── layout.tsx            App shell + bottom nav. force-dynamic.
│   │       ├── home/  search/  favorites/  account/
│   │       ├── listing/[id]/         Listing detail
│   │       ├── post/                 Publish a vehicle, part or gear (?category=…)
│   │       ├── rental/[id]/          Rental offer → checkout → confirmation
│   │       ├── seller/[id]/          Public seller profile
│   │       └── chats/  chats/[id]/   Inbox and thread
│   ├── api/                          See §9
│   └── manifest.ts                   PWA manifest
├── components/                       See §10
├── db/
│   ├── schema.ts                     14 tables, all enums, relations
│   ├── client.ts                     Lazy driver switch (PGlite ↔ postgres-js)
│   └── bootstrap.ts                  btree_gist + the overlap constraint
├── server/                           Server-only data and write logic. See §3
├── lib/                              Pure helpers, no I/O
├── mocks/                            The fallback dataset AND the reference data
├── i18n/                             Custom translation layer
├── messages/{az,en,ru}.json          All UI copy
├── types/                            Domain types — the contract
├── stores/                           zustand
├── hooks/
└── middleware.ts                     Locale negotiation and redirect
scripts/                              db:migrate, db:seed, db:reference, db:check, check:api, check:mocks, icons
drizzle/                              Generated SQL migrations
docs/                                 PRD (English translation) + ARCHITECTURE.md
```

### State management

Deliberately minimal. **There is no global app state.**

- **Server state** lives on the server. Screens are async Server Components that `await` from `@/server/data`.
- **URL state** — all search and filter state is in the query string (`src/lib/search-params.ts`). Every result view is shareable, the back button behaves, and a saved search is a serialised query.
- **zustand** is used for exactly two things: `stores/favorites.ts` (persisted ids) and `stores/preferences.ts`.

Do not introduce Redux, React Query, or a global store. Nothing in this product needs one.

### Database / ORM

Drizzle over Postgres. `DATABASE_URL` selects the driver:

- **Set** → `postgres-js` against the hosted server (Neon, Frankfurt)
- **Unset + `USE_LOCAL_DB=1`** → PGlite, embedded, writes to `./.pglite`
- **Neither** → the app reads from `src/mocks/` and does not persist writes

### Authentication

**None.** `src/server/session.ts` returns a demo persona, optionally overridden by the `iki-demo-user` cookie (used for testing both sides of a transaction). It is deliberately shaped like real auth — async, per-request, capable of returning "nobody" — so phone sign-in replaces one function body and no caller.

Blocked on: a registered legal entity and an SMS provider contract.

### Storage

**Cloudflare R2**, bucket `iki-teker` (EU jurisdiction), read back through `cdn.ikitekerli.az`. `src/server/storage.ts` is the whole adapter.

Two backends behind one interface. With the five `R2_*` variables set, `/api/uploads` hands the browser a signed URL and the bytes go straight to the bucket — never through a function, which has a request-body limit a phone photo does not fit under. Without them, files are written to `.uploads/` and served by the app: the same upload, message and rendering, so the feature runs with no account anywhere.

Rows store the object's **key**, never its URL — moving domains is configuration, not a migration over every message. `R2_ENDPOINT` is copied whole from the dashboard rather than assembled from an account id, because a jurisdiction-bound bucket lives on a different host.

Carries chat photos and listing photos. Chat objects live under `chat/{threadId}/`, listing objects under `listings/{sellerId}/` — filed by seller because the pictures are chosen before the listing has an id. Publishing accepts only keys under the publisher own prefix that are actually present in storage.

`VehicleArt` takes an optional `src`, so the generated silhouette is the **fallback**, not the plan: a listing with no photographs still renders as a listing rather than a hole.

### Deployment

- **Vercel**, project `iki-teker`, auto-deploys from `main`
- Domain **ikitekerli.az** — registered at online.az, DNS on Cloudflare (free), pointed at Vercel by record (`A @ 76.76.21.21`, `CNAME www cname.vercel-dns.com`)
- **The Cloudflare proxy (orange cloud) must stay OFF** while hosting is Vercel, or the two TLS layers collide
- Production env vars: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`

---

## 3. Architecture

### Data flow

```
Server Component (page.tsx)
        │  await
        ▼
  src/server/data.ts          ← the facade every screen imports
        │
        ├── useDatabase === false ──▶ src/lib/queries.ts ──▶ src/mocks/*
        │
        └── useDatabase === true  ──▶ src/server/db-queries.ts ──▶ Drizzle ──▶ Postgres
                                              │
                                        src/server/mappers.ts
                                        (DB row → domain type)
```

Both branches return **identical domain types**. A screen cannot tell which is behind it. This was verified field-by-field, not assumed.

### The source switch — the single most important architectural fact

`src/server/source.ts`:

```ts
export const useLocalDatabase = process.env.USE_LOCAL_DB === "1";
export const useDatabase = useLocalDatabase || Boolean(process.env.DATABASE_URL);
```

**The order matters.** Next loads `.env.local` itself, so `DATABASE_URL` is set even when you asked for the embedded database. If `DATABASE_URL` were checked first, `USE_LOCAL_DB=1` would silently write to production — which is how test data once reached the live database.

Every read goes through `src/server/data.ts`. Every write module (`bookings.ts`, `listings.ts`, `listing-actions.ts`, `messaging.ts`) branches on `useDatabase` and returns a sensible result in both cases.

**Why the mock branch still exists:** it lets the whole app run with zero infrastructure, which is how the demo was shown and how a contributor can start in one command. Deleting it would be a regression.

### Frontend

Server Components by default. A component becomes `"use client"` only when it needs interaction, browser storage or an effect. The client components are:

`chat-thread`, `contact-actions`, `owner-actions`, `favorite-button`, `listing-gallery`, `request-queue`, `search-controls`, `post-listing-screen`, `checkout-screen`, `favorites-screen`, `rental-screen`, `onboarding-screen`, `splash-screen`, `bottom-nav`, `city-picker`, `locale-*`, `theme-*`, `pwa/*`.

Anything that runs in the browser and needs data must go through an API route — it cannot import `@/server/*`.

### Backend

There is no separate backend service. Server Components read directly; API routes exist only for what the browser must initiate.

**`src/server/` module map:**

| File | Responsibility |
|---|---|
| `source.ts` | The `useDatabase` switch |
| `data.ts` | **Read facade.** Every screen imports from here |
| `db-queries.ts` | Database implementation of every read |
| `mappers.ts` | DB row → domain type |
| `session.ts` | Who the request is from (auth seam) |
| `bookings.ts` | Request / confirm / decline / owner queue |
| `listings.ts` | Publishing a vehicle |
| `listing-actions.ts` | Status changes, deletion, view and contact counters |
| `messaging.ts` | Opening a thread, sending, marking read |

All are `import "server-only"`.

### Middleware

`src/middleware.ts` does one thing: if a path has no locale prefix, negotiate one (cookie → `Accept-Language` → default `az`) and redirect, setting a year-long `iki-locale` cookie. It does not touch auth, headers or anything else.

### Reusable components

See §10. The `ui/` folder holds the primitives (`button`, `badge`, `chip`, `sheet`, `skeleton`) built with `class-variance-authority`.

### Utilities (`src/lib/` — pure, no I/O)

| File | Purpose |
|---|---|
| `demo-clock.ts` | **Fixed clock: `DEMO_NOW = 2026-07-27T09:41+04:00`.** Also `datesBetween`, `daysBetween`, `toISODate` |
| `format.ts` | Every `Intl` call, each wrapped in a `safe()` fallback |
| `queries.ts` | The mock-branch query implementation + pure helpers (`quote`, `isRangeAvailable`, `locationOf`) |
| `search-params.ts` | `parseSearchQuery` / `serialiseSearchQuery` — URL is the state |
| `site.ts` | `siteUrl()` from env, never hardcoded |
| `utils.ts` | `cn()` |

---

## 4. Features Completed

### Browsing and search
- **Home feed** — rental rail, VIP rail, fresh listings, parts, workshop shortcuts, category tiles, city picker, language picker
- **Search** — full-text term, category, make, model, city, price range, year range, condition, engine-displacement buckets, rental-only, VIP-only, customs-cleared, delivery
- **Sorting** — newest, price ↑/↓, year, mileage, nearest. **VIP listings always sort first, in every order**
- **Live filter counter** — the apply button says exactly how many listings you will get, counted server-side, debounced, with stale replies discarded by sequence number
- **Listing detail** — gallery, spec table driven by the category's attribute schema, description, seller card, rental cross-sell, similar listings
- **Seller profile** — rating, tenure, verification, listings, parts, rental offers, reviews

### Rental
- **Offer screen** — rates (hour/day/week/long-stay), deposit, minimum and maximum days, pickup point, what's included, licence requirement, availability calendar
- **Availability calendar** — owner blackouts merged with dates held by confirmed bookings
- **Checkout** — server-computed quote, licence upload gate, terms gate
- **Booking request → owner confirmation → double-booking guarantee** (see §7)
- **Owner request queue** on the account screen: confirm or decline, with the conflict case explained in place

### Selling
- **Publish a vehicle** — dependent make/model selects, category-specific attributes, full server-side validation, generated artwork
- **Moderation** — new listings queue for review; a role-gated screen approves or rejects them with a reason, every decision is written to an audit table, and the seller sees the outcome on their account
- **Publish a part or gear** — a separate form: the seller writes the title (a part name is not derivable from a taxonomy), plus brand, type, part number, stock, and fitment as makes + a year window. Gear requires a size and carries no fitment
- **Manage your own listing** — mark sold, archive, republish, delete (with confirmation)
- **Real counters** — views and contacts increment in the database; the seller's own visits do not count

### Messaging
- **Persistent chat** — messages are stored, not simulated
- **One thread per buyer + listing pair** — tapping "message seller" twice continues the conversation
- **Membership enforced server-side** — a stranger writing into a thread gets 403

### Platform
- **Three languages** (az / en / ru) with a typed dictionary — a missing key fails typecheck
- **Light and dark themes**
- **PWA** — manifest, maskable icons, service worker (network-first navigations), offline page, install screen
- **Mobile-only presentation** — full-bleed below 528px, centred 430×884 device frame above

---

## 5. Features In Progress

Nothing is half-written in the working tree. The following are **specified and modelled but have no implementation**:

| Feature | State |
|---|---|
| **Rental disputes** | `src/mocks/admin.ts` types them. Reporting a listing or a person is built (`complaints` table, `/admin/complaints`); opening a dispute over a rental is **not** — it needs the handover/return flow first |
| **Workshops / service booking** | `src/mocks/services.ts` has workshops, service items and appointments. Only the home-feed shortcut renders. **No tables** |
| **Favourites sync** | Works via localStorage. A `favorites` table exists in the schema and is unused — syncing needs auth to mean anything |

---

## 6. Remaining Tasks — prioritised

### P0 — blocks everything user-specific
- [ ] **Phone authentication (OTP).** Blocked on a legal entity and an SMS provider. Replace the body of `currentUser()` in `src/server/session.ts`; no caller changes. Add session storage, sign-in/up screens, and route protection for `/post`, `/account`, `/chats`.

### P1 — the product is not credible without these
- [ ] **Rental disputes.** Reporting a listing or a person is built. Opening a dispute over a rental is not, and cannot be until a booking can reach `returned` through a handover/return flow — `bookings.ts` only implements `pending → confirmed` and `pending → cancelled`.

### P2 — trust and retention
- [ ] **Notifications** — a booking request with nobody watching the account screen is a lost rental. Web Push first (the service worker already exists)
- [ ] **Favourites synced to the account** (needs P0)
- [ ] **Saved searches with alerts**

### P3 — revenue
- [ ] **Paid promotion** — VIP and bump packs. The data model already carries `vip`, `vipUntil`, `bumpsLeft`, `lastBumpedAt`, and the counters that justify the price now work
- [ ] **Rental commission collection** — `commissionRate` is stored per offer and computed per booking; nothing collects it
- [ ] **Card payment and deposit hold** — the UI already says this is phase two

### P4 — reach
- [ ] **Play Store via TWA.** The PWA is ready. **Note: TWA is Android-only.** iOS needs Capacitor and Apple frequently rejects bare web wrappers under guideline 4.2
- [ ] **Real content** — the first ~300 genuine listings
- [ ] **Workshop directory and service booking**

---

## 7. Important Business Rules

These are product decisions, not implementation details. Changing them changes the product.

### Listings
- A listing's **title, slug, make name, model name, artwork, counters and VIP flag are derived server-side.** The client sends only what the seller typed. A listing whose title disagreed with its make and model would be unfindable
- The **year must fall inside the model's production run** (+1, because dealers list next model years early)
- The **district must belong to the chosen city**, and the **make must build that category** — a make that makes no scooters cannot be the make of a scooter
- Description minimum 20 characters, maximum 4000
- Stored under all three locales with the same text. Translation cannot be invented, and leaving two locales blank would make `localized()` fall back to an empty string
- A seller may set only `active`, `sold` or `archived`. `moderation` and `draft` are not theirs to assign
- **Published as `moderation`, not `active`.** Nothing reaches buyers unreviewed

### Sellers
- Ownership is checked **server-side for every mutation**. A listing id is public; trusting the client would let anyone delete a stranger's motorcycle
- `sold` and `archived` are distinct: "sold" is a useful public fact (the market cleared at that price); archiving claims nothing
- Deletion is irreversible and asks first

### Buyers
- **Contact details are hidden until a booking is confirmed.** If the parties swap phone numbers on first contact, the deal leaves the platform and the platform earns nothing
- Revealing a phone number is a **discrete, recorded event** — not a passive display

### Rentals — the core guarantee
- **A request is not a hold.** Several renters may hold `pending` requests for the same dates; the owner picks one. Refusing the second request would promise the first renter a vehicle the owner has not agreed to hand over
- **Confirmation is where the lock lands.** The Postgres exclusion constraint covers `confirmed` and `active` only:

  ```sql
  EXCLUDE USING gist (offer_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
  WHERE (status IN ('confirmed', 'active'))
  ```

  Two confirmations for overlapping dates cannot both succeed, whatever the timing. This is proven by test (`npm run check:api`), not asserted
- **A declined request frees nothing** because it never held anything
- **A cancelled booking releases its dates**
- Every price is **recomputed from the offer**. A price posted from a browser is a suggestion
- `days = end − start`, floored at 1
- **Long-stay rate applies automatically** at or above `minDays`
- **Renters pay no service fee** while payment is cash on pickup; commission is taken from the owner's side
- **An owner cannot rent their own vehicle**

### Workshops
Modelled (`types/services.ts`, `mocks/services.ts`) with categories, hours, ratings, service items and appointments. Only the home-feed shortcut is built. **No tables** — this data lives in `src/mocks/` in both source modes.

### Messaging
- **One thread per (buyer, listing) pair.** History that matters must not scatter across duplicate threads
- **Membership is enforced on the server.** Thread ids are guessable
- **Message bodies are not localised.** Real conversations in Baku code-switch between Azerbaijani and Russian; translating them would make the product less credible
- Sending bumps the thread's `updatedAt`, which orders the inbox
- Chat is the dispute record for a rental — it is the only evidence either side has

### Reviews
Tied to a verified transaction (`verifiedTransaction`) and a context (`purchase`, `rental`, `service`). Displayed on seller profiles. **Not yet writable.**

### Favourites
localStorage only, via zustand `persist`. The favourites screen resolves ids through `POST /api/catalog` and caches by id, so removing one is instant and adding one asks about the new id only.

### VIP listings
`promotion.vip` sorts a listing first **in every sort order** — that is what the seller is paying for. `vipUntil`, `bumpsLeft` and `lastBumpedAt` are modelled; nothing sells or expires them yet.

### Contact reveal logic
`POST /api/listings/[id]/contact` increments atomically in SQL. **The seller's own reveals do not count.** This is the number paid promotion is sold against — a figure inflated by its own author would be worthless.

### View counter logic
Incremented server-side during the listing page render (not awaited — a slow write must not delay the page). Counted on the server rather than from the browser so it does not miss anyone who leaves before scripts run. **The seller's own visits do not count.**

### Moderation
- New listings are created as `moderation` and are invisible to buyers until approved
- **Flags are computed on read, never stored** — a stored flag goes stale the moment a seller edits their description
- The flag that matters commercially is a phone number or messenger handle in the description: it routes the deal around the platform
- **Rejecting requires a reason** from a fixed list; a rejected listing becomes a `draft`, not a deletion, because most rejections are fixable
- Every decision is written to `moderation_actions` with its author. A second decision on an already-decided listing returns **409**
- The moderator is **not** the default demo persona — with no sign-in, that would put the queue one URL from the public. The page answers **404**, not 403

---

## 8. Existing Data Models

Domain types live in `src/types/`; tables in `src/db/schema.ts`. **The types are the contract** — both source branches return them.

### Tables (14)

```
cities ──< districts
   │           │
   └───────────┴──< users ──< listings ──< rental_offers ──< rental_blackouts
                       │          │              │
                       │          │              └──< bookings >── users (renter, owner)
                       │          │
                       │          └──< chat_threads ──< chat_participants >── users
                       │                    │
                       │                    └──< messages >── users
                       │
                       ├──< reviews (author → target)
                       └──< favorites
makes ──< models
```

| Table | Notes |
|---|---|
| `cities`, `districts` | `name` is **jsonb** (`{az,en,ru}`), not text. Lat/lng as numeric |
| `makes`, `models` | `models.category` scopes a model to a vehicle category. `yearFrom`/`yearTo` bound valid listing years |
| `users` | Private person or business (`kind`), rating, review/rental counts, verification, response time, subscription |
| `listings` | **Vehicles and parts share one table**, discriminated by `kind`. Vehicle columns (`makeId`, `modelId`, `year`, `customsCleared`) and part columns (`brand`, `partType`, `partNumber`, `stock`, `compatibility`) are nullable. Free-form `attributes` is jsonb |
| `rental_offers` | Rates, deposit, min/max days, licence requirement, pickup, includes, `commissionRate` |
| `rental_blackouts` | Owner-set unavailable days. Distinct from booked days, which are derived from `bookings` |
| `bookings` | Carries the **frozen price** (`dayPrice`, `subtotal`, `serviceFee`, `deposit`, `total`, `commission`) so a later rate change cannot rewrite history. **Holds the `bookings_no_overlap` constraint** |
| `reviews` | Author, target, rating, context, `verifiedTransaction` |
| `chat_threads`, `chat_participants`, `messages` | Threads may be anchored to a listing and/or a booking. Participants is a join table, and it owns `archived` — filing a conversation away is a decision about *your* inbox, so the flag is per person, not per thread |
| `moderation_actions` | Every approve/reject with its author and reason. Never updated or deleted |
| `complaints` | Reports about a listing or a person. `entityId` carries **no foreign key** — the target is polymorphic, and `entityLabel` freezes what was reported so the record outlives the listing. Unique on `(reporterId, entityType, entityId)`: one account, one report per thing |
| `favorites` | **Exists and is unused** — favourites are localStorage today |

### Enums

`account_kind`, `booking_status` (`pending|confirmed|active|returned|cancelled|disputed`), `catalog_kind`, `condition_kind`, `document_status`, `licence_category`, `listing_status` (`active|moderation|draft|sold|archived`), `message_kind`, `payment_method`, `review_context`, `complaint_reason`, `complaint_status` (`open|upheld|dismissed` — a closed report's status is its outcome).

### Reference data is not in the database path

Cities, districts, makes, models, categories and attribute schemas are read **in-process from `src/mocks/`** by both source branches. `db:reference` copies them into a hosted database so foreign keys resolve, but the app does not query them. This is intentional: they are small, static, and needed synchronously by client components (the post form's dropdowns).

### Types with no table

`types/services.ts` (workshops, service items, appointments) and the dispute, audit and revenue halves of `types/admin.ts` are mock-only.

---

## 9. API Endpoints

All are `export const dynamic = "force-dynamic"`. Identity comes from `currentUserId()` — never from the request body.

### `POST /api/catalog`
Resolve a batch of listing ids. Favourites live in localStorage, so the server cannot know what to render until the browser says. Capped at 100 ids.

```jsonc
// request
{ "ids": ["l-vespa-bmr", "l-cb650r-rashad"] }
// 200
{ "items": [ /* CatalogItem[], in the order asked for */ ],
  "offers": { "l-vespa-bmr": { /* RentalOffer */ } } }
```

### `GET /api/search/count?<SearchQuery>`
How many listings the current draft filters would return. Uses the same parser as the search page, so the number on the button and the results behind it cannot disagree.

```jsonc
// 200
{ "count": 55 }
```

### `POST /api/listings`
Publish a vehicle.

```jsonc
// request — everything else is derived server-side
{ "category": "motorcycles", "makeId": "make-honda", "modelId": "model-honda-cb650r",
  "year": 2021, "price": 15900, "negotiable": true, "condition": "used",
  "cityId": "city-baku", "districtId": "d-yasamal",
  "description": "…", "delivery": false, "customsCleared": true,
  "attributes": { "engineCc": 649, "mileage": 8200, "colour": "black",
                  "licence": "A", "bodyType": "naked" },
  "locale": "az" }
// 201
{ "listing": { /* Listing */ }, "persisted": true }
// 400 { "error": "missing", "field": "cityId" }
// 422 { "error": "modelMismatch", "field": "modelId" }
```

`persisted: false` means there is no database; the listing was built and returned but not stored, and the client must not navigate to its page.

### `PATCH /api/listings/[id]`
Change status. Owner only. `active | sold | archived`.
`200 { ok, status }` · `403 notOwner` · `404 notFound` · `422 invalidStatus`

### `DELETE /api/listings/[id]`
Delete. Owner only. `200 { ok }` · `403` · `404`

### `POST /api/listings/[id]/contact`
Record a phone reveal. Seller's own reveals are ignored.
`200 { "contacts": 13 }` (`null` when there is no database)

### `POST /api/bookings`
Request a rental. Prices are recomputed from the offer; anything price-shaped in the body is ignored.

```jsonc
// request
{ "listingId": "l-vespa-bmr", "start": "2027-09-10", "end": "2027-09-14",
  "licenceUploaded": true, "agreementAccepted": true }
// 201
{ "booking": { "code": "IT-4588", "days": 4, "total": 380, "status": "pending", … } }
// 404 notFound · 409 unavailable
// 422 pastDate | invalidRange | belowMinimum | aboveMaximum
//     licenceRequired | agreementRequired | ownVehicle
```

### `POST /api/bookings/[id]/confirm`
Owner accepts. **Where the exclusion constraint arbitrates.**
`200 { booking }` · `403 notOwner` · `404` · `409 unavailable` · `422 alreadyDecided`

### `POST /api/bookings/[id]/decline`
Owner declines. Frees nothing, because a pending request held nothing.
`200 { booking }` · `403` · `404` · `422 alreadyDecided`

### `POST /api/threads`
Open (or find) the conversation about a listing.
`200 { threadId }` · `404 notFound` · `422 ownListing`

### `POST /api/threads/[id]/messages`
Send a message. Membership enforced.
`201 { message }` · `403 notParticipant` · `404` · `422 empty | tooLong`

---

## 10. UI Pages

All app routes sit under `/[locale]/(app)/` and render inside the device shell.

| Route | Purpose | Key components | Status |
|---|---|---|---|
| `/[locale]` | Splash → onboarding or home | `SplashScreen` | Done |
| `/[locale]/onboarding` | 3-step intro | `OnboardingScreen` | Done |
| `/[locale]/install` | PWA install instructions per platform | `InstallScreen` | Done |
| `/[locale]/home` | Feed: rentals, VIP, fresh, parts, workshops | `Rail`, `RailCard`, `CityPicker`, `LocalePicker`, `CategoryIcon` | Done |
| `/[locale]/search` | Results + filter sheet | `SearchControls`, `ListingRow`, `Sheet`, `Chip` | Done |
| `/[locale]/listing/[id]` | Listing detail | `ListingGallery`, `SpecTable`, `FavoriteButton`, `ContactActions` / `OwnerActions`, `Rail` | Done |
| `/[locale]/post?category=…` | Publish a vehicle | `PostListingScreen` | **Vehicles only** |
| `/[locale]/rental/[id]` | Rental offer + calendar | `RentalScreen`, `AvailabilityCalendar`, `PriceBreakdown` | Done |
| `/[locale]/rental/[id]/checkout` | Confirm and send a request | `CheckoutScreen`, `PriceBreakdown` | Done |
| `/[locale]/rental/[id]/confirmation` | Booking sent, 4-step tracker | — | Done |
| `/[locale]/seller/[id]` | Public seller profile | `ListingRow`, `Badge` | Done |
| `/[locale]/chats` | Inbox | — | Done |
| `/[locale]/chats/[id]` | Thread | `ChatThread` | Done |
| `/[locale]/favorites` | Saved listings | `FavoritesScreen` | Done |
| `/[locale]/account` | Profile, **owner request queue**, my rentals, language, theme | `RequestQueue`, `LocaleSwitcher`, `ThemeToggle` | Done |

**Not built:** admin panel, seller dashboard, workshop directory, service booking, review composer, sign-in.

---

## 11. Design System

Tokens are CSS custom properties in `src/app/globals.css`, exposed to Tailwind through `@theme inline`. **Never hardcode a colour in a component.**

### Colours

| Token | Light | Meaning |
|---|---|---|
| `--background` | `#f4f1ea` | Warm paper canvas, not white |
| `--foreground` | `#12110f` | Near-black ink |
| `--card` | `#ffffff` | |
| `--primary` | `#ffc800` | Signal yellow — the brand |
| `--rental` | `#1f7a45` | Green: everything rental. A second colour axis, not a variant |
| `--vip` | `#ffc800` | |
| `--warning` | `#c77a0a` | |
| `--destructive` | — | Errors and deletion |
| `--muted`, `--subtle-foreground`, `--border` | | Hierarchy |

Every token has a dark counterpart under `.dark`. Soft variants (`--primary-soft`, `--rental-soft`, `--warning-soft`) are for badge backgrounds.

### Typography

- **Display** — Manrope, `font-display`, extrabold. Headings, prices, primary buttons. Often uppercase with tracking
- **Body** — Inter
- **`.tabular`** — tabular figures. **Use on every number that can change**: prices, dates, counters, ratings. Without it, digits jitter as they update

### Spacing and shape

- 4px base scale (Tailwind default)
- Screen padding `px-4`; sections `space-y-5` / `space-y-6`
- Radii: `rounded-lg` small, `rounded-xl` cards, `rounded-2xl` sheets and raised buttons, `rounded-full` pills
- **Touch targets ≥ 44px.** `size="md"` (h-11) is the minimum for a real action; `sm` (h-9) is for secondary chips only
- `--shadow-card` for cards; avoid ad-hoc shadows

### Custom utilities

`no-scrollbar` · `safe-top` / `safe-bottom` / `safe-x` (env insets) · `hazard-stripe` (the brand's yellow/black diagonal) · `glass` (blurred bar) · `snap-rail` (horizontal snap) · `press` (active scale)

### Primitives (`src/components/ui/`)

| Component | Variants |
|---|---|
| `Button` | `primary · secondary · outline · ghost · rental · danger` × `sm · md · lg · icon · iconSm`, plus `block` |
| `Badge` | `vip · rental · rentalSoft · muted · outline · ink · warning` × `sm · md` |
| `Chip` | Selectable filter pill |
| `Sheet` | Bottom sheet (filters, sort, post menu) |
| `Skeleton` | Including `ListingCardSkeleton` |

### Layout law

The app shell is a **flex column**: header (fixed height) / main (`flex-1 overflow-y-auto`) / bottom nav. **Never use `position: fixed`** for these — it breaks inside the desktop device frame and behaves differently across mobile browsers.

Below `33rem` (528px) the app is full-bleed. Above it, a 430×884 frame is centred. **There is no desktop layout and there must not be one** — this product is a mobile app.

---

## 12. Known Issues

### Functional gaps
1. **No authentication.** Anyone can act as the demo persona. Every ownership check is correct but rests on a cookie
2. **No photo upload.** All listings show generated artwork
5. **Reviews cannot be written**
6. **No notifications.** A booking request with nobody watching the account screen is a lost rental
7. **Favourites are device-local.** The `favorites` table is unused
8. **Workshops and admin data are mock-only** — no tables, identical in both source modes

### Technical debt
9. **`mapBooking` returns `steps: []` and `respondsInMinutes: 15` hardcoded** (`src/server/db-queries.ts`). No UI reads them today, so it is invisible — but the type promises data that is not there
10. **`db.execute()` result shape differs by driver.** PGlite returns `{ rows }`, postgres-js returns the array. This already caused one bug where a healthy database reported its safety constraint as missing (`hasOverlapGuard` now handles both). **Any new raw `execute` must handle both shapes**
11. **`.returning()` does not typecheck** on the `db` union type. Use update-then-select (see `recordContact`)
12. **`next lint` is not configured.** Running it opens an interactive prompt. Only `tsc --noEmit` is wired
13. **The demo clock is fixed** at `2026-07-27`. Every "today" derives from it. Going live means removing `DEMO_NOW`, and several mock dates are relative to it
14. **Mock and database can drift.** Nothing automatically proves they still agree; it was verified manually. A test that diffs both sources would be worth writing

### Operational
15. **PGlite leaves `.pglite/postmaster.pid` behind** when a dev server is killed. `db:seed` explains it and `FORCE_UNLOCK=1` clears it
16. **Anything else writing `.next` while a dev server runs corrupts it** — a second dev server, or `npm run build`. The symptom is `Cannot find module './vendor-chunks/*.js'` and every API route returning **500**, which looks exactly like a code regression and is not. Stop the server, delete `.next`, restart. This has cost real debugging time more than once
17. **Vercel's free tier forbids commercial use.** A real launch needs Pro or self-hosting
18. **Neon's free tier sleeps on inactivity** — the first request after idle is slow

---

## 13. Coding Standards

### Comments
This codebase comments **why, not what**. A comment explains a decision, a trade-off, or a non-obvious constraint. It never narrates code that already says what it does. Match this — do not strip existing comments, and do not add `// increment the counter` noise.

### Types
- `src/types/` is the contract. Both source branches satisfy it
- No `any`. `unknown` plus narrowing at boundaries
- `noUncheckedIndexedAccess` is on — `array[0]` is `T | undefined`. Handle it, do not cast it away

### Server / client boundary
- Server Components by default. `"use client"` only for interaction, browser storage or effects
- Server-only modules start with `import "server-only"`
- **Client components must never import `@/server/*`** — they use API routes

### Data access
- **Screens import from `@/server/data`, never from `@/lib/queries` or `@/mocks`** for data. (Reference data — cities, makes, models, categories — is the exception and is imported directly)
- Every new read gets both branches in `data.ts`
- Every new write branches on `useDatabase` and behaves sensibly without a database

### Validation
- **Validate on the server, always.** Client validation is a courtesy so the user is told before submitting
- Never trust a price, an id, an owner or a status from a request body
- Return a **specific reason**, not a generic failure. Each reason gets copy in all three languages

### i18n
- All user-facing text goes in `src/messages/*.json`
- **`en.json` is the reference.** `MessageKey` is a recursive dot-path union derived from it, so a key missing from az or ru **fails typecheck**
- Message bodies in chat are not localised — see §7

### Formatting
- 2-space indent, double quotes, semicolons, trailing commas
- Import order: external → `@/` → relative, alphabetical within groups
- Prettier defaults, 100 columns

### Testing
No unit test framework. Verification is done by scripts that exercise real behaviour:

```bash
npm run check:mocks   # referential integrity + arithmetic across the mock dataset
npm run db:check      # proves the database refuses a double booking (either engine)
npm run check:api     # 78 assertions over the write APIs (needs a running DB-backed server)
```

**Add to these when you add behaviour.** A test that asserts a row count proves nothing; these attempt the thing that must fail and check that it did.

---

## 14. Do Not Change

Each of these was a deliberate decision with a cost paid for it.

1. **The mobile-only presentation.** No desktop layout. The client specified this and the whole design assumes it
2. **The source facade (`src/server/data.ts`) and the `useDatabase` switch.** Do not let a screen import `db-queries` or `mocks` for data
3. **The booking overlap constraint, and that it covers `confirmed`/`active` only.** Adding `pending` would break the product rule that a request is not a hold
4. **Server-side derivation of listing fields.** Never accept a title, slug, seller, status, VIP flag or counter from a client
5. **The custom i18n layer.** It is ~120 lines, has no runtime dependency, and gives compile-time key safety that next-intl does not. Do not replace it
6. **`en.json` as the reference dictionary** and the typed `MessageKey` union
7. **URL as search state.** Do not move filters into a store
8. **The flex-column app shell.** Never `position: fixed` for header, main or nav
9. **Design tokens.** No hardcoded colours in components
10. **`src/lib/` is pure.** No I/O, no imports from `@/server`
11. **The lazy database client** (`src/db/client.ts` Proxy). Importing it must not start a database — that cost every serverless cold start and every build before it was made lazy
12. **`siteUrl()` reads the environment.** Never hardcode a domain
13. **Cloudflare proxy stays off** while hosting is Vercel
14. **`db:seed` truncates** and must keep refusing to run against a hosted database without `ALLOW_REMOTE_SEED=1`

---

## 15. Next Recommended Steps

In this order.

**1. Real SMS.** Sign-in, sessions and passwords are built and tested; the one-time code is the only part still simulated. This is the last thing standing between the product and real accounts, and it is blocked on a registered legal entity rather than on code — `src/server/auth/sms.ts` is already the seam it plugs into.

**2. Promotion and payments.** The counters that justify a promotion price now work, so this can finally be sold honestly. The PRD puts cash at launch by design, so this is about VIP placement, not checkout.

**3. Service directory.** Workshops are modelled and seeded, with no screen. The smallest remaining feature that adds a whole audience.

**4. Rental disputes.** Needs the handover/return flow before it can exist — a dispute is about a rental that went wrong, and no booking can currently reach `returned` through the app.

**5. Play Store (TWA).** Android only. iOS needs a different approach.

---

## 16. Context For The Next AI

Read this section first if you are picking this up cold.

### What kind of codebase this is

Small, dense and deliberate. About 118 TypeScript files, no dead code, no scaffolding left over from a generator. Almost every non-obvious line has a comment explaining the decision behind it. **If something looks odd, read the comment above it before changing it** — most oddities are load-bearing.

### The two things that will confuse you first

**1. There are two data sources and both are real.** `src/mocks/` is not test fixtures — it is a hand-built dataset that models the real domain, and it is what the app serves when no database is configured. `src/server/data.ts` hides which one is active. When you add a read, you must add it to both branches. When you add a write, the no-database branch must do something sensible (usually: compute the result, return it, and tell the client it was not stored).

**2. Reference data does not come from the database.** Cities, districts, makes, models, category attribute schemas — these are imported from `src/mocks/` even in database mode. That is intentional: they are static, small, and client components need them synchronously. `db:reference` copies them into a hosted database only so foreign keys resolve.

### How to run it

```bash
npm install
npm run dev                                   # mocks, no database, everything works
USE_LOCAL_DB=1 npm run db:seed
npm run dev:local                             # embedded Postgres, writes persist
```

`dev:local` sets `USE_LOCAL_DB=1` in Node rather than in the shell, because this project is developed on Windows and deployed from Linux and inline environment variables are not portable between them.

Against the hosted database, put `DATABASE_URL` in `.env.local` (gitignored) and run `npm run dev`.

**Only run one dev server at a time** — two share `.next` and corrupt each other's compilation.

### How to verify you did not break anything

```bash
npx tsc --noEmit      # the typed dictionary catches missing translations here
npm run check:mocks
npm run db:check      # needs a database
npm run check:api     # needs a running DB-backed server
npm run build
```

### The one guarantee that must never regress

Two people cannot book the same vehicle for overlapping dates. It is enforced by a Postgres exclusion constraint, not application code, and `check:api` proves it by firing two confirmations concurrently and asserting exactly one wins. If you touch `src/db/bootstrap.ts`, `src/server/bookings.ts`, or the booking status flow, run that test.

### What "done" looks like here

Work in this repo has been verified against reality, not asserted. Screens were driven in a real browser; API behaviour was tested against the hosted database; the live domain was checked after each deploy. Several bugs found this way would have passed a code review — a stale dev server that made fixes look broken, a driver difference that made a healthy database report a missing safety constraint, a `router.refresh()` timing artefact that looked like a UI bug and was not. **Measure before you conclude.**

### Language and audience

The product ships in Azerbaijani, English and Russian. The primary market is Baku. The client communicates in Azerbaijani/Turkish. Code, comments and this document are in English.

### Current live state

- <https://ikitekerli.az> — Vercel, `main` auto-deploys
- Neon Postgres, Frankfurt, seeded with the demo catalogue (58 listings, 15 users, 8 rental offers, 9 bookings)
- Real listings, bookings and messages written through the site **persist**
- No sign-in: everyone is the same demo persona
