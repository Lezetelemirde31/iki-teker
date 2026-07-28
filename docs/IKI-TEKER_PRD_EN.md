# IKI-TEKER — Two-Wheeler Marketplace for Azerbaijan

**Product Requirements Document (English edition)**

> Source documents: `Iki-Teker_prezentatsiya_bez_cen.pdf` (15-slide concept deck) and `Iki-Teker_KP_bez_cen.pdf` (project & work plan). This is a full, professionally rewritten English version of both — nothing has been omitted or condensed. Pricing for the engagement was already removed from the source files; all monetary figures that remain are in-product example data denominated in Azerbaijani manat (₼ / AZN).
>
> Author: **Danil Gimadiev** — digital product design & development, Baku
> Date: **July 26, 2026**

---

# Part I — Concept Deck

## Slide 01 — Cover

**IKI-TEKER**

A two-wheeler marketplace for Azerbaijan: buy, sell, service, and rent — motorcycles, scooters, electric vehicles, and bicycles.

*Concept and launch plan — Danil Gimadiev*
*July 26, 2026 · Product design & development · Baku*

---

## Slide 02 — What It Is

### Everything two-wheeled, in one place

Today in Baku, a motorcycle gets sold in Instagram groups, a spare part is tracked down through friends-of-friends, and mechanics are recommended over DMs. There is no single platform for any of it: Turbo.az covers cars, and nobody covers two-wheelers.

| | Pillar | What it covers |
|---|---|---|
| 🏍️ | **Buy** | Motorcycles, scooters, electric vehicles, bicycles — new and used. |
| 🔧 | **Find a part** | Search by compatibility with a specific make and model, from both shops and private sellers. |
| 🛠️ | **Get it serviced** | A directory of workshops with ratings, plus repair booking directly from the vehicle listing. |
| 🗝️ | **Rent** | Daily rental with an availability calendar, security deposit, and a rental agreement. Nobody in the market offers this. |

---

## Slide 03 — The Core Idea

### Rental is what generates revenue from day one

A classifieds board only makes money at scale: paid promotion starts selling once the platform already has thousands of visitors — and in the first months, it won't. Rental works on a fundamentally different model: the platform takes a percentage of every booking, starting with the very first one.

| Metric | What it means |
|---|---|
| **₼0** | is what listings earn in month one — nobody buys promotion while there is no audience to promote to. |
| **From booking #1** | the rental commission starts working. Revenue does not have to wait for audience accumulation. |
| **Seasonal** | tourists and city scooter rental in Baku — demand that is currently being served by hand, over chat. |

---

## Slide 04 — Screen · Home

### The first screen shows what's available to rent, immediately

**Search and categories**
Seven vehicle sections plus a dedicated rental entry point — one tap takes the user straight to the right section.

**"Available to rent" block**
Vehicles that are free today, with a per-day price and deposit. It sits above the for-sale listings — this is the platform's stated priority.

**VIP listings**
A paid slot in the most visible block on the page. The first revenue stream, and it works without online payments.

**New arrivals and popular parts**
A live feed that proves the platform isn't empty and gives people a reason to come back.

#### Screen walkthrough — Home

The home screen opens as a phone-first layout. A status bar reads `9:41` with `Baku · 5G`. The header carries the **IT IKI-TEKER** wordmark on the left and two pill toggles on the right — a city selector (`Bakı`) and a language selector (`RU`) — separated from the content by the brand's yellow-and-black hazard-stripe divider.

Below it sits a full-width search field with the placeholder *"Motorcycle, scooter, spare part…"*, then an eight-tile category grid:

| Row 1 | Row 2 |
|---|---|
| 🏍️ Motorcycles | 🔧 Spare parts |
| 🛵 Scooters | 🪖 Gear |
| ⚡ Electric | 🛠️ Services |
| 🚲 Bicycles | 🗝️ Rental |

Next comes the **Available to rent** carousel with an "all →" link. Each card shows an availability badge, the vehicle name, the daily rate, and pickup/requirement details:

- **TODAY** — Vespa Primavera 150 — **₼45** / day — Icherisheher · deposit ₼200
- **FROM AUG 2** — Honda Rebel 500 — **₼90** / day — Nasimi · licence A required
- (third card partially in view) — Ninebot… — ₼18… — Bulvar…

Below that, a **VIP listings** carousel with its own "all →" link, where each card is tagged with a yellow **VIP** badge.

The persistent bottom navigation bar has five destinations: **Home**, **Search**, **Post** (a yellow `+` action button, visually elevated), **Chats**, **Account**.

---

## Slide 05 — Screens · Search

### Filters built for vehicles, not generic ones

**Engine displacement, mileage, year, customs-cleared status**
Each category gets its own field set: an electric scooter exposes range and battery health; a bicycle exposes frame size.

**"Available to rent" filter**
A single tap separates vehicles you can take for a day from those that are only for sale.

**Saved search**
A user subscribes to *"Honda under ₼15,000"* and gets notified when a matching listing appears. Return traffic without ad spend.

#### Screen walkthrough — Search results

Header: a back chevron, the section title **Motorcycles**, and a **Filters** link on the right. Under it, a search field pre-filled with `Honda CB`, followed by a horizontal row of active filter chips: `Baku`, `up to ₼15,000`, `2015+`, `Has rental`.

A results bar reads **248 LISTINGS** on the left and a sort control **Newest first** on the right. The result cards:

| Badge | Listing | Price | Specs | Tags |
|---|---|---|---|---|
| **VIP** | Honda CB650R, 2019 | ₼14,500 | 649 cm³ · 12,400 km · Baku | Shop, Delivery |
| **RENTAL** | Honda Rebel 500, 2022 | ₼21,000 | 471 cm³ · 4,300 km · Nasimi | For rent · ₼90/day |
| — | Kawasaki Z900, 2020 | ₼19,800 | 948 cm³ · 9,100 km · Yasamal | Private seller |
| — | Suzuki GSX-S750, 2018 | ₼13,200 | 749 cm³ · 18,900 km · Ganja | Negotiable |

#### Screen walkthrough — Filters

A full-screen filter sheet with a close (`✕`) control, the title **Filters**, and a **Reset** action.

- **CATEGORY** — chip row: `Motorcycles` (selected), `Scooters`, `Electric`, `Bicycl…`
- **Make** — Honda · **Model** — CB650R · **City** — Baku (all drill-down rows)
- **PRICE, ₼** — From `5,000` / To `15,000`
- **YEAR OF MANUFACTURE** — From `2015` / To `2026`
- **ENGINE DISPLACEMENT, CM³** — `up to 125`, `125–400`, `400–750` (selected), `750+`
- **ADDITIONAL** — `Has rental` (selected), `Customs cleared`, `With delivery`
- Primary action: **SHOW 248 LISTINGS**

---

## Slide 06 — Screen · Listing

### A listing detail page that removes the need to call and ask

**Up to 15 photos**
The first image becomes the cover in search results. Images are auto-compressed on upload so the page opens fast on mobile data.

**Specs as a structured table**
Mileage, displacement, year, condition, customs status — stored as fields that search actually queries, not buried in free-text descriptions.

**A seller with a track record**
Rating, reviews, time on the platform, verified phone number. Everything that goes into deciding whether to message or move on.

**Revealing the phone number is an event**
Every contact reveal is counted. The seller can see how many times their listing converted — and understands exactly what they're paying for.

#### Screen walkthrough — Listing detail

Header: back chevron, title **Listing**, and a favorite (heart) toggle.

The photo gallery is tagged with a **VIP** badge in the top-left corner and a `1 / 12` counter in the bottom-left. Below it:

- **Honda CB650R, 2019**
- **₼14,500** with an adjacent **Negotiable** chip
- Meta line: *Baku, Yasamal · published July 24 · 412 views*

A two-column specification table:

| | |
|---|---|
| **Mileage** — 12,400 km | **Displacement** — 649 cm³ |
| **Year** — 2019 | **Condition** — Used |
| **Type** — Naked | **Customs cleared** — Yes |

The bottom navigation remains persistent, with **Search** highlighted as the active tab.

---

## Slide 07 — Rental · Steps 1–2

### Pick the vehicle, pick the dates

**Hourly, daily, and weekly rates**
With long-term discounts and a minimum rental period — the owner sets their own rules.

**Booked dates are visible up front**
The availability calendar makes it impossible to book a vehicle that is already out. Double-booking is prevented at the database level.

**Price calculated live**
₼45 × 4 days + deposit — the renter sees the total before submitting the request, so there's nothing to argue about at handover.

#### Screen walkthrough — Rental listing

Header: back chevron, title **Rental**, favorite toggle. A green **AVAILABLE TODAY** badge overlays the photo, with a `1 / 8` gallery counter.

- **Vespa Primavera 150, 2020**
- *Icherisheher · pickup at Icherisheher metro*

The pricing card shows **₼45** / day, followed by a chip row of conditions: `7+ days — ₼38`, `Deposit ₼200`, `Min. 1 day`.

Two date fields — **START** `Aug 8` and **END** `Aug 12` — sit above the primary CTA:

> **BOOK · ₼180**

with the reassurance line *"Free cancellation within 24 hours"* directly beneath it. Below the fold, a spec block begins: **Displacement** 155 cm³ · **Licence** Cat. A1.

#### Screen walkthrough — Booking calendar

Header: back chevron, title **Rental dates**. The two date fields now read **START** `Sat, Aug 8` and **END** `Wed, Aug 12`.

A month view for **August 2026** (week starting Monday: Mon, Tue, Wed, Thu, Fri, Sat, Sun) renders three date states:

- **Selected range endpoints** (`8`, `12`) — solid yellow
- **In-range days** (`9`, `10`, `11`) — light yellow
- **Unavailable / already booked** (`1`, `2`, `3`, `4`, `19`, `20`, `21`) — struck through and greyed

A legend confirms the encoding: **selected** (yellow) / **booked** (grey).

A live price breakdown follows:

| Line item | Amount |
|---|---|
| ₼45 × 4 days | **₼180** |
| Deposit (refundable) | **₼200** |

Primary action: **CONTINUE**

---

## Slide 08 — Rental · Steps 3–4

### Booking, agreement, and a clear sequence of events

**Renter documents**
A verified phone number, plus a driving licence for motorized vehicles — checked by a moderator, not by the owner on the spot.

**Agreement signed via SMS**
Generated automatically with both parties' details and the vehicle's. Photos and odometer readings are captured at handover and return — that's the evidence that settles any dispute.

**Pay on pickup**
At launch: cash, with no card acquiring. The platform still records its commission, and online payment is switched on in the second phase.

#### Screen walkthrough — Booking checkout

Header: back chevron, title **Booking checkout**.

A summary card shows the **Vespa Primavera 150**, the window `Aug 8, 10:00 → Aug 12, 10:00`, and the location `Icherisheher`.

**RENTER**

| Field | Value |
|---|---|
| Name | Elvin Q. |
| Phone | +994 55 314 22 08 ✓ |
| Driving licence | **upload ›** |

**PAYMENT**

| Field | Value |
|---|---|
| Rental | on pickup, cash |
| Deposit | ₼200 cash |

> *Note shown inline: "In phase 2, card payment and deposit pre-authorization will appear here."*

**Totals**

| Line item | Amount |
|---|---|
| ₼45 × 4 days | ₼180 |
| Service fee | ₼0 |
| Deposit | ₼200 |
| **Due on pickup** | **₼380** |

A checkbox at the bottom: ☑ *"I agree to the rental agreement and the platform rules."*

#### Screen walkthrough — Booking confirmation

Header: back chevron, title **Booking**. A green success checkmark leads into:

> ### Request sent
> *Baku Moto Rent usually replies within 12 minutes. As soon as the owner confirms, you'll get a notification and the agreement.*

A booking card shows **Vespa Primavera 150** · `Aug 8 → 12 · 4 days` · status chip **Awaiting confirmation**.

**WHAT HAPPENS NEXT**

| # | Step | Status |
|---|---|---|
| 1 | Owner confirms | ~12 min |
| 2 | Agreement signed via SMS | — |
| 3 | Inspection and photos at handover | Aug 8 |
| 4 | Return and reviews | Aug 12 |

Secondary actions: **MESSAGE THE OWNER**, **BACK TO HOME**.

---

## Slide 09 — Screens · Listing Creation

### A listing in three steps — and an immediate offer to rent it out

**Make and model reference catalog**
Not free text. Consistent naming is what makes search and filters meaningful and listings genuinely comparable.

**"Let your vehicle earn its keep"**
On the final step, the seller is invited to rent the motorcycle out while it's sitting on the market. This is how the rental inventory gets filled.

**Promotion offered at the moment of decision**
VIP and bump are offered right where the user is already in a results-oriented mindset — not in an email a week later.

#### Screen walkthrough — Step 1 of 3: Make and model

Header: back chevron, **New listing**, step indicator `1 / 3`, and a three-segment progress bar with segment one filled.

- **CATEGORY** — tile grid: `Motorcycles` (selected), `Scooters`, `Electric`, `Bicycles`, `Spare parts`, `Gear`
- **MAKE AND MODEL** — Make `Honda` › · Model `CB650R` › · Year of manufacture `2019` ›
- Helper text: *"Makes and models come from a reference catalog. Not on the list? Enter it manually and a moderator will add it."*
- Primary action: **NEXT**

#### Screen walkthrough — Step 2 of 3: Photos and price

Header: back chevron, **Honda CB650R**, step indicator `2 / 3`, two progress segments filled.

- **PHOTOS · 3 OF 15** — three thumbnails, the first tagged **COVER**, plus a `+ add` tile
- **SPECIFICATIONS** — MILEAGE, KM `12,400` · DISPLACEMENT, CM³ `649` · CONDITION `Used` · CUSTOMS CLEARED `Yes` · CITY `Baku, Yasamal`
- **DESCRIPTION** — placeholder: *"Tell buyers about condition, servicing, equipment…"*
- **PRICE** — PRICE, ₼ `14…` · NEGOTIABLE `Yes`

#### Screen walkthrough — Step 3 of 3: Rental and promotion

Header: back chevron, **Rent it out?**, step indicator `3 / 3`, all three progress segments filled.

A prominent toggle card, switched **ON**:

> **Rent this vehicle out**
> *While it's sitting on the market — let it earn*

- **RATES** — HOUR, ₼ `—` · DAY, ₼ `120` · WEEK, ₼ `700`
- **CONDITIONS**

| Setting | Value |
|---|---|
| Deposit | ₼500 › |
| Minimum period | 2 days › |
| Category A licence | required › |
| Cancellation | free within 24 h › |
| Availability calendar | configure › |

- **PROMOTION**

| Option | Price |
|---|---|
| VIP for 7 days | ₼12 › |
| Bump in search ×5 | ₼8 › |
| No promotion | free › |

---

## Slide 10 — Screens · Trust

### The transaction stays on the platform

**Chat with full history**
Every agreement is preserved. In a rental dispute, this is the only evidence both sides actually have.

**Ratings and reviews**
A review can only be left after a completed rental, not on a whim. That's why the rating can be trusted.

**Defense against migrating to WhatsApp**
For rentals, contact details are revealed only after the booking is confirmed. If deals move to messengers, the platform earns nothing at all.

#### Screen walkthrough — Chat

Header: back chevron, avatar initials `RM`, contact name **Rəşad M.**, presence status *online*.

A pinned context card sits at the top of the thread: **Honda CB650R, 2019 — ₼14,500**.

| From | Message | Time |
|---|---|---|
| Buyer | "Salam! Is the motorcycle still available?" | 14:02 |
| Seller | "Salam, yes, it's available. You can view it in Yasamal any day after 18:00." | 14:05 ✓✓ |
| Buyer | "Can you show the service book? And what year are the tires?" | 14:06 |
| Seller | "Of course. Michelin Road 5 tires, fitted last summer, ~4,000 km on them." | 14:08 ✓✓ |
| Seller | *[document attachment]* | 14:08 ✓✓ |
| Buyer | "Great. I'll come by tomorrow at 18:30." | 14:11 |

The bottom navigation shows **Chats** as the active tab.

#### Screen walkthrough — Seller profile

Header: back chevron, title **Seller**.

- Avatar `BM` · **Baku Moto Rent** · ★ 4.8 · 156 rentals · 42 reviews · badge **Verified shop**
- Stat tiles: **2 years** on the platform · **12 min** average response time · **31** listings
- Address — *Baku, Icherisheher* › · Opening hours — *09:00 – 20:00*

**Listings (31 →)**

| Badge | Vehicle | Rate |
|---|---|---|
| RENTAL | Vespa Primavera 150 | ₼45 / day |
| RENTAL | Honda Rebel 500 | ₼90 / day |
| — | Hel… (partially visible) | 640… |

**Reviews (42 →)**

> `EQ` **Elvin Q.** ★★★★★ — *Vespa rental · July 2026*
> "Scooter was clean, fueled up, helmets were fine. Handover took 10 minutes, deposit was returned immediately."

---

## Slide 11 — Screens · Services and Seller Dashboard

### Workshops, and a real workspace for sellers

**Book a repair online**
Service, vehicle, date, and an indicative price. Workshops receive leads and become paying partners of the platform.

**Sellers see the numbers**
Views, inquiries, VIP expiry date. When the return is visible, promotion gets renewed without anyone having to sell it.

**Rental as a revenue stream**
Booking requests, the availability calendar, and monthly income — all in one place. For rental companies, this is a working tool, not a storefront.

#### Screen walkthrough — Services directory and booking

Header: back chevron, title **Services**, and a **Map** link on the right. A search field with the placeholder *"Service, job, make…"*, then a filter chip row: `Nearby` (selected), `Moto`, `Scooters`, `Bicycle`, `Electr…`.

| Workshop | Rating & distance | Specialties | Badge |
|---|---|---|---|
| **Moto Servis Bakı** | ★ 4.9 · 87 reviews · 2.1 km | Scheduled service, diagnostics, tire fitting | Open until 20:00 |
| **ScooterFix** | ★ 4.6 · 34 reviews · 3.8 km | Scooters, e-scooters, batteries | Mobile mechanic |
| **Veloservis 28 May** | ★ 4.7 · 51 reviews · 1.4 km | Bicycles: servicing, assembly, wheel building | — |

**BOOKING · MOTO SERVIS BAKI**

| Field | Value |
|---|---|
| Service | Service 2, 12,000 km › |
| Vehicle | Honda CB650R › |
| Date | Thu, July 30 › |
| Time | 11:30 › |

#### Screen walkthrough — My dashboard (seller cabinet)

Header: back chevron, title **My dashboard**, settings gear.

- Avatar `RM` · **Rəşad M.** · ★ 4.9 · on the platform 2 years · status chip **Phone ✓**
- Stat tiles: **4** active · **1,284** views · **17** inquiries

**My listings** — tabs: `Active 4` (selected), `In moderation 1`, `Drafts 2`

| Badge | Listing | Price | Performance | Status |
|---|---|---|---|---|
| VIP | Honda CB650R, 2019 | ₼14,500 | 412 views · 6 inquiries | VIP until July 31 |
| RENTAL | Vespa Primavera 150 | ₼45 / day | Booked Aug 8 → 12 | 1 request awaiting reply |

**RENTAL**

| Row | Value |
|---|---|
| Booking requests | **1 new** › |
| Availability calendar | August › |
| Monthly income | ₼640 › |

---

## Slide 12 — Screen · Administration

### The platform needs to be operated every single day

**Moderation queue**
Every listing is reviewed before it goes live. The system automatically flags anything suspicious: duplicated photos, banned keywords, duplicate listings.

**Rental disputes**
Handover and return photos, the chat history, the agreement — all in one window. Decisions get made on facts, not on how loudly each side complains.

**Finance and reference data**
Promotion payments, rental commissions, makes and models — all editable without a developer in the loop.

**Audit log**
You can see which moderator took down what, and when. Without it, a platform with more than one employee is unmanageable.

#### Screen walkthrough — Admin panel

Header: back chevron, title **Admin panel**, and a **Demo** label.

> *Inline note: "In production this is a separate web interface designed for a large screen. Shown here is the composition of its sections."*

Counter tiles: **14** in moderation · **3** complaints · **2** disputes

**MODERATION QUEUE**

| Item | Details | Actions |
|---|---|---|
| Ducati Monster 821, 2017 | ₼9,800 · Baku · 4 min ago | **OK** / ✕ |
| Chain kit, used | ₼45 · duplicate photo ⚠ · 11 min ago | **OK** / ✕ |
| Ninebot F40, 2024 | ₼560 · Sumgait · 22 min ago | **OK** / ✕ |

**SECTIONS**

| Section | Count |
|---|---|
| Users and verification | 3,412 › |
| Listings | 1,987 › |
| Bookings and disputes | 2 disputes › |
| Finance: VIP and commissions | ₼1,240 / month › |
| Reference data: makes, models | 318 › |

---

## Slide 13 — Unit Economics

### How the platform makes money

| Instrument | How it works | When it switches on |
|---|---|---|
| **Rental commission** | A percentage of every confirmed booking. The percentage is configurable and can be set to zero at launch — build the habit first, monetize second. | From the first transactions |
| **VIP listings** | Highlighting and priority placement in search results for 7, 14, or 30 days. Paid by bank transfer, confirmed by an administrator. | Immediately |
| **Bump in search** | A one-off refresh of a listing's position, sold in packs. The most frequently purchased micro-transaction on any classifieds board. | Immediately |
| **Shop subscription plan** | A subscription covering a branded storefront, logo, listing quota, and publishing without manual moderation. | Month 1–2 |
| **Services and advertising** | Priority placement for workshops in the directory, banners, sponsored categories, and a delivery commission. | Once traffic arrives |

> Every phase-one instrument works without online payments. Accepting card payments requires a registered legal entity and a bank agreement — and that paperwork can run in parallel with development without delaying launch.

---

## Slide 14 — Rollout Plan

### Web first, apps later

| | **Phase 1 · 8 weeks** | **Phase 2** | **Phase 3** |
|---|---|---|---|
| **Theme** | A working platform | Money online | Apps |
| **Scope** | A website that opens from a phone like an app: catalog, listings, rental, chat, services, admin panel, seller dashboard, three languages. | Card payments, shop subscription plans, paid promotion, delivery, extended analytics. | A Telegram Mini App, then native iOS and Android — on a backend that already exists. |

### Why not apps first

- An app isn't indexed by Google, and search is what delivers the bulk of a marketplace's visitors.
- People don't install an app for a platform they've never heard of — they find a listing first, then get used to the service.
- Developer accounts have to be registered to a company, and store review takes weeks.

### What this approach buys you

- A working product in two months, not in a year.
- One codebase instead of three: web, Android, and iPhone all open the same thing.
- App-store requirements around complaints and moderation are designed in from the start — no rework later.

---

## Slide 15 — Delivery Process

### How we'll work

| # | What is ready by this point |
|---|---|
| 1 | Technical specification approved, prototype handed over |
| 2 | Foundation: phone-number login, reference catalogs, database |
| 3 | Catalog, listing creation, and rental are working |
| 4 | Chat, admin panel, seller dashboard, and three languages are working |
| 5 | Acceptance, launch on the production domain, source-code handover |

Each milestone is a result you can open and verify — not a checkbox on a calendar. After launch: platform support and further development under a separate plan.

### What we need from you

- A registered legal entity — for SMS and payment acceptance
- A public offer agreement and platform rules, drafted by a lawyer
- The first 300 listings before public launch
- A person on moderation duty after launch
- Domain and hosting

### Next step

- Answer six product questions — a ten-minute conversation
- Approve the technical specification
- Work starts within a week

**DANIL GIMADIEV · BAKU**

---
---

# Part II — Project and Work Plan (Commercial Proposal)

**IKI-TEKER** — Two-wheeler marketplace
*Project and work plan, dated July 26, 2026*
*To: [client name]*

## A motorcycle marketplace: from an idea to something you can actually build

You've described a product on the scale of Turbo.az — apps, a website, an admin panel, and dashboards for both sellers and service providers. The goal is right. The sequencing, I'd suggest, should be different: specification and a working prototype first, then turnkey development of the first version. Work is delivered against milestones — each stage is a result you can open and verify.

### Why not "everything at once"

The full scope of your concept is 6–12 months of team effort. While it's being built, both the market and your own understanding of the product shift, and budget gets spent on features that — as it turns out later — nobody uses. The typical failure mode for projects like this isn't technical; it's money spent on things users never asked for.

So the first step is a document you can actually build the project from: a detailed technical specification, the structure of every screen, the database model, and a clickable prototype. One week of work instead of six months. After that:

- you can see the future product on a phone screen and show it to partners or an investor;
- the scope is locked and won't start drifting in week three of development;
- you don't pay for the rework that always shows up when development starts without a specification.

### What I added to your concept

**Rental.** It isn't in the original description, and it's the most revenue-generating part of the project. For-sale listings generate almost nothing at launch: VIP placements only start working at high traffic, which won't exist in the first months. Rental produces a commission on every transaction from day one — and it is precisely what a classifieds board like Turbo.az does not do. In the technical specification, the module is worked out end to end: hourly, daily, and weekly rates, an availability calendar, security deposits, an agreement signed via SMS, photo documentation at handover and return, and dispute resolution.

### The prototype is already built

A demonstration version of the interface is ready: **16 screens**, including the complete rental flow — from the vehicle listing and date selection through to booking confirmation. It opens from a link on your phone, with nothing to install: `[link]`

---

## Two stages of work

### Stage 1 · Specification
**5–7 days · design**
**Deliverable: technical specification and prototype**

- Technical specification, 30+ pages
- Screen map covering every flow
- Vehicle categories and attributes
- Database model
- The rental module in full
- Clickable prototype, 16 screens
- Development schedule

### Stage 2 · Working version — *primary scope*
**8 weeks · development**
**Deliverable: a working platform**

- Website that opens from a phone like an app
- Catalog, search, filters, map
- Listing creation with photos and moderation
- Rental: rates, calendar, bookings, deposit, agreement
- Chat, reviews, seller ratings
- Services and repair booking
- Admin panel and seller dashboard
- Three languages, SEO, launch on your domain

> The specification is not a separate purchase — it's the first stage of the engagement. I won't take on development without it: a signed technical specification is exactly what locks the scope and protects both sides from the "but that's not what we agreed" conversation.

---

## Delivery schedule

Each milestone is a result you can open and put your hands on, not a checkbox on a calendar.

| # | What is ready by this point |
|---|---|
| 1 | **Kickoff:** technical specification approved and signed, prototype handed over |
| 2 | **Foundation:** phone-number login, make and model reference catalogs, database |
| 3 | Catalog, listing creation, and rental with booking are working |
| 4 | Chat, admin panel, seller dashboard, and three languages are working |
| 5 | **Acceptance:** launch on your domain, handover of source code and rights |

## After launch

| Track | What it covers |
|---|---|
| **Support** | Bug fixes, minor enhancements, updates, assistance for the moderator |
| **Monetization** | Online card payments, shop subscription plans, paid promotion, delivery |
| **Telegram Mini App** | Catalog and bookings inside Telegram, notifications via a bot, the same backend |
| **Apps** | Native iOS and Android on the already-built backend, published to the App Store and Google Play |

**Why apps aren't the first step.** An app isn't indexed by Google, and search is precisely what delivers the bulk of a marketplace's visitors. People don't install an app for a platform they don't know — they find a listing first, and only then get used to the service. So: the website first, opening from a phone like an app; then — once there's real traffic — Telegram or the app stores. By that point the backend already exists, and Apple's and Google's requirements for user-generated-content platforms (complaints, blocking, moderation) are already accounted for in the technical specification, so nothing has to be rebuilt.

---

## Terms

- Payment against the milestones fixed in the contract
- The 8-week timeline starts from the beginning of development
- Source code and rights are transferred in full upon the final payment; until then the project runs on my test environment
- Changes within the signed specification carry no surcharge
- Features outside the specification require a separate estimate and a separate timeline

## What we need from you

- A registered legal entity — without it, SMS and payment acceptance can't be connected
- A contract with an SMS provider for phone-number verification
- The text of the public offer agreement and platform rules, from a lawyer
- Content: the first 300 listings before public launch
- A person on moderation duty after launch
- Payment for domain and hosting

---

## Questions that determine the product's structure

1. **Rental** — rental companies only, or will private individuals also be able to rent out their own vehicles?
2. **Geography** — Baku only, or all of Azerbaijan?
3. Are there already agreements in place with shops, rental companies, or workshops?
4. Who will moderate the platform and respond to users after launch?
5. Is there a budget planned for marketing? Without traffic, a marketplace doesn't get off the ground, no matter how good it is.
6. Where will the first 300 listings come from? That's a separate workstream, and it needs to be solved before launch, not after.

---

**Danil Gimadiev**
Digital product design and development · Baku
`[phone]` · `[email]` · `[Telegram]`

---
---

# Part III — Executive Summary

## Product overview

**Iki-Teker** is a vertical marketplace for two-wheeled vehicles in Azerbaijan, covering the full ownership lifecycle: buying, selling, renting, sourcing spare parts, and booking servicing. It targets a genuinely unserved category — Turbo.az owns the automotive vertical, while two-wheeler commerce currently happens informally across Instagram groups, personal networks, and private messaging. The differentiating bet is **peer-to-peer and commercial rental**, a capability no incumbent classifieds platform in the market offers.

## Core features

- **Multi-category catalog** — motorcycles, scooters, electric vehicles, bicycles, spare parts, riding gear, plus services and rental as first-class sections
- **Vertical-specific search and filtering** — category-aware attribute sets (displacement, mileage, customs-cleared status, battery range, frame size), a "has rental" toggle, and saved searches with new-match notifications
- **Structured listings** — up to 15 auto-compressed photos, typed specification fields that power search, seller reputation surface, and instrumented phone-number reveals
- **End-to-end rental module** — hourly/daily/weekly rates with long-stay discounts and minimums, an availability calendar with database-level double-booking prevention, live price calculation, security deposits, moderator-verified renter documents, SMS-signed agreements, and photo/odometer capture at handover and return
- **Three-step listing creation** with an upsell to list the vehicle for rent while it's on the market, and promotion offered at the point of decision
- **Trust and retention layer** — persistent chat history, post-rental-only reviews, and contact-gating until a booking is confirmed to prevent off-platform leakage
- **Services directory** with ratings, distance, specialties, and online repair booking
- **Seller dashboard** — listing performance, moderation state, booking requests, availability calendar, monthly rental income
- **Admin console** — moderation queue with automated flagging (duplicate photos, banned keywords, duplicate listings), rental dispute resolution, finance and reference-data management, and a moderator audit log
- **Localization** — three languages, plus city selection

## Business model

A managed two-sided marketplace that deliberately front-loads transactional revenue over advertising revenue. Rental bookings are monetized from the first transaction, avoiding the classic classifieds cold-start problem where promotion inventory is worthless until traffic exists. All phase-one revenue instruments are designed to operate without card acquiring, so entity registration and bank onboarding can proceed in parallel with development rather than gating launch.

## Revenue model

| Stream | Mechanism | Activation |
|---|---|---|
| Rental commission | % of every confirmed booking (configurable, can launch at 0%) | From the first transactions |
| VIP listings | Highlighting + search priority for 7 / 14 / 30 days, paid by transfer | Immediately |
| Bump in search | One-off position refresh, sold in packs | Immediately |
| Shop subscription | Storefront, logo, listing quota, moderation-free publishing | Month 1–2 |
| Services and advertising | Workshop priority placement, banners, sponsored categories, delivery commission | Once traffic arrives |

## Target users

- **Private buyers and sellers** of motorcycles, scooters, e-vehicles, and bicycles
- **Renters** — tourists and Baku residents seeking short-term scooter and motorcycle access
- **Private owners** monetizing idle vehicles while they're listed for sale
- **Commercial rental operators** (e.g. Baku Moto Rent) who need an operational tool, not just a storefront
- **Parts shops and dealers** subscribing to branded storefronts
- **Repair workshops** converting directory placement into booked jobs
- **Platform operators** — moderators and administrators running the marketplace daily

## Technical modules

1. **Identity and access** — phone-number (OTP) login, verification states
2. **Reference data service** — makes, models, categories, attribute schemas; admin-editable without deployment
3. **Catalog and search** — typed attributes, category-aware faceted filtering, saved searches, map view
4. **Listing management** — three-step creation, media pipeline with auto-compression, drafts, moderation states, editing
5. **Rental engine** — rate plans, availability calendar, booking state machine, deposits, agreement generation with SMS signature, handover/return photo and odometer capture
6. **Messaging** — persistent threads with listing context and contact-gating rules
7. **Reputation** — ratings and reviews gated on completed transactions
8. **Services and appointments** — workshop directory, availability, repair booking
9. **Promotion and billing** — VIP, bump, subscriptions, commission ledger; card acquiring added in phase 2
10. **Seller dashboard** — listing analytics, booking inbox, availability management, income reporting
11. **Admin console** — moderation queue with automated heuristics, dispute resolution workspace, finance, reference data, audit log
12. **Localization and SEO** — three languages, city scoping, server-rendered indexable pages
13. **Notifications** — saved-search alerts, booking lifecycle events; Telegram bot channel in phase 3
14. **Client surfaces** — mobile-first PWA-style web (phase 1), Telegram Mini App, then native iOS/Android on the shared backend (phase 3)
