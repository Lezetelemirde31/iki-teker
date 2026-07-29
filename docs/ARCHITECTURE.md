# IKI-TEKER — Frontend Architecture

Production-quality frontend prototype. Mock data only — no auth, no APIs, no database.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn/ui · Framer Motion · Lucide · next-themes · Zustand (persisted) · custom lightweight i18n

## 0. Platform decision — mobile is the source of truth

IKI-TEKER is a mobile application (iOS/Android), not a responsive website. There is **no desktop layout**:

- **< 528px** — the app is full-bleed. This is what ships to a phone: no bezel, no simulated status bar, the OS draws its own chrome, `safe-*` utilities handle notch and home-indicator insets.
- **≥ 528px** — the identical UI is centred inside a device frame (430×884, iPhone Pro Max logical width) on an ambient backdrop, with a simulated status bar and dynamic island. Chrome only — no component is aware it is being framed.

Layout consequence: the app shell is a flex column — `header` (sticky) / `main` (`flex-1`, internal scroll) / `tab bar` — never `position: fixed`. That gives correct native behaviour in both modes and keeps scrolling inside the frame on desktop.

UI patterns follow modern iOS/Android conventions: bottom tab bar, bottom sheets for filters and pickers, large-title headers, swipe-dismissible modals, momentum rails with snap, press-scale feedback on every tappable surface.

---

## 1. Design system

Derived from the prototype screens in the source PDF.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--brand` | `#FFC800` | `#FFD027` | Primary CTA, VIP badge, active nav, selected calendar days |
| `--ink` | `#12110F` | `#F5F3EE` | Text, dark chips, bottom nav bar |
| `--canvas` | `#F4F1EA` | `#0D0D0C` | Page background (warm off-white) |
| `--surface` | `#FFFFFF` | `#191917` | Cards, sheets |
| `--rental` | `#1F7A45` | `#3FA96A` | "Available today" / RENTAL badges |
| `--muted` | `#8A867C` | `#8F8B82` | Secondary text, specs labels |
| `--danger` | `#C0392B` | `#E5675A` | Errors, "upload required", moderation reject |

- **Radius scale** — `sm 8 / md 12 / lg 16 / xl 20 / 2xl 28` (cards use `lg`, sheets `2xl`)
- **Spacing** — 4px base, section rhythm 16 / 24 / 32 / 48 / 72
- **Typography** — `Manrope` (display: headings, prices, stat tiles) + `Inter` (UI/body). Both cover Latin Extended, Azerbaijani diacritics (ə ş ğ ı ö ü ç) and Cyrillic.
- **Signature element** — the yellow/black hazard-stripe divider under the header (`HazardDivider`)
- **Motion** — Framer Motion; page transitions 180ms ease-out, list stagger 40ms, sheet spring `{ stiffness: 320, damping: 32 }`. All respect `prefers-reduced-motion`.

---

## 2. Route architecture

All routes are nested under `app/[locale]/` with `locale ∈ { az, en, ru }`. Azerbaijani is the default.

### Marketing / entry
| Route | Screen |
|---|---|
| `/` | **Landing page** — hero, value pillars, live rental rail, how-it-works, economics, investor CTA. Fully SEO-rendered. |
| `/home` | **App home** — the PDF's first screen: search, 8 category tiles, "Available to rent", VIP listings, new & popular parts |

> Decision: `/` is a marketing/SEO surface; `/home` is the transactional home. A returning-visitor cookie can redirect `/` → `/home` later.

### Catalog & discovery
| Route | Screen |
|---|---|
| `/search` | **Search results** — URL-driven state (`category, make, model, city, priceMin/Max, yearMin/Max, cc, hasRental, delivery, customs, sort, page`) |
| `/c/[category]` | Category landing (motorcycles, scooters, electric, bicycles, gear) |
| `/listing/[id]` | **Vehicle details** |
| `/rentals` | Rental catalog |
| `/rental/[id]` | **Rental details** — rates, conditions, availability |
| `/parts` · `/parts/[id]` | **Spare parts** — compatibility search by make/model |
| `/services` · `/services/[id]` | **Repair services** directory + workshop detail |
| `/vip` | **VIP listings** showcase |
| `/seller/[id]` | **Seller profile** — stats, listings, reviews |

### Rental booking flow
| Route | Step |
|---|---|
| `/rental/[id]/dates` | **Booking calendar** — range picker, blocked dates, live price |
| `/rental/[id]/checkout` | Renter documents, payment method, totals, agreement consent |
| `/rental/[id]/confirmation` | Request sent, 4-step "what happens next" tracker |

### Listing creation
| Route | Step |
|---|---|
| `/sell` | Wizard entry |
| `/sell/category` | **Step 1/3** — category, make, model, year |
| `/sell/details` | **Step 2/3** — photos (15 max, cover), specs, description, price |
| `/sell/rental` | **Step 3/3** — rent-it-out toggle, rates, conditions, promotion |
| `/listing/[id]/edit` | **Edit listing** — same form, pre-filled, with status banner |

### Account
| Route | Screen |
|---|---|
| `/login` · `/register` | **Login / Register** — phone + OTP simulation |
| `/account` | **User profile** |
| `/account/settings` | **Settings** — language, city, theme, notifications, privacy |
| `/favorites` | **Favorites** |
| `/notifications` | **Notifications** — saved-search hits, booking events |
| `/chats` · `/chats/[id]` | **Chat list / thread** |

### Seller dashboard
| Route | Screen |
|---|---|
| `/dashboard` | Overview — active / views / inquiries tiles |
| `/dashboard/listings` | Active · In moderation · Drafts |
| `/dashboard/bookings` | Booking requests inbox |
| `/dashboard/calendar` | Availability manager |
| `/dashboard/income` | Monthly rental income |
| `/dashboard/promotion` | VIP & bump purchase |

### Admin console
| Route | Screen |
|---|---|
| `/admin` | Counters: in moderation · complaints · disputes |
| `/admin/moderation` | **Moderation queue** with auto-flags (duplicate photos, banned words, duplicates) |
| `/admin/users` | Users & verification |
| `/admin/listings` | All listings |
| `/admin/disputes` | Rental disputes — handover/return photos, chat, agreement, in one workspace |
| `/admin/finance` | VIP payments & rental commissions |
| `/admin/catalog` | Reference data: makes, models, categories |
| `/admin/audit` | Moderator audit log |

### System
`not-found.tsx` (404) · `error.tsx` (500) · `loading.tsx` per segment · `global-error.tsx` · `/offline`

---

## 3. Folder structure

```
src/
├─ app/
│  ├─ [locale]/
│  │  ├─ layout.tsx                 # locale, theme, i18n, fonts
│  │  ├─ (marketing)/               # landing — no bottom nav
│  │  ├─ (shop)/                    # AppShell: top nav + bottom nav
│  │  ├─ (flow)/                    # focused flows: sell, booking, auth — minimal chrome
│  │  ├─ (dashboard)/               # seller dashboard — side nav
│  │  └─ (admin)/                   # admin console — side nav, dense tables
│  ├─ sitemap.ts  robots.ts  manifest.ts  opengraph-image.tsx
│  └─ globals.css
├─ components/
│  ├─ ui/                           # shadcn primitives
│  ├─ layout/                       # AppShell TopNav BottomNav SideNav Footer CommandPalette
│  ├─ brand/                        # Logo HazardDivider
│  ├─ common/                       # EmptyState ErrorState Skeletons Price Rating StatTile Gallery
│  ├─ home/  search/  listing/  rental/  sell/
│  ├─ parts/  services/  seller/  chat/
│  ├─ dashboard/  admin/
│  ├─ i18n/                         # LocaleSwitcher CitySwitcher
│  ├─ theme/                        # ThemeProvider ThemeToggle
│  └─ motion/                       # PageTransition FadeIn Stagger
├─ lib/                             # utils, format (currency/date/locale), filters, seo, constants
├─ hooks/                           # useSearchParamsState useMediaQuery useFavorites useBookingDraft
├─ stores/                          # zustand: session, favorites, chat, listings, bookings, notifications, ui
├─ types/                           # domain models
├─ mocks/                           # seed data: vehicles, rentals, parts, services, sellers, chats, bookings, admin
└─ messages/                        # az.json · en.json · ru.json
```

---

## 4. Domain model (mock types)

`Vehicle` · `RentalOffer` · `RateCard` · `AvailabilityCalendar` · `Booking` (`pending → confirmed → active → returned → disputed`) · `Part` · `Workshop` · `Appointment` · `Seller` · `User` · `Review` · `ChatThread` · `Message` · `Notification` · `SavedSearch` · `Promotion` (`vip | bump`) · `ModerationItem` · `Dispute` · `AuditEntry` · `Make` / `Model`

Category-specific attribute schemas drive both filters and the create-listing form:

| Category | Attributes |
|---|---|
| Motorcycles / Scooters | displacement, mileage, year, type, condition, customs cleared, licence category |
| Electric | range, battery health, motor power, top speed, mileage |
| Bicycles | frame size, frame material, wheel size, gears, discipline |
| Parts | compatible make/model/year, part number, condition, new/used |
| Gear | type, size, certification, condition |

---

## 5. Simulated behaviour (no backend)

| Concern | Simulation |
|---|---|
| Auth | Phone + 6-digit OTP; any code accepted; session in Zustand + `localStorage` |
| Search | In-memory filter/sort/paginate over seeded data, debounced, URL-synced |
| Booking | Blocked dates from seed; client-side conflict check mirrors the "no double-booking" rule |
| Chat | Seeded threads + scripted auto-reply after ~1.2s to demo the flow |
| Uploads | `URL.createObjectURL` previews, simulated compression progress |
| Moderation | Optimistic approve/reject moving items between queues |
| Latency | `withDelay()` wrapper (250–600ms) so skeletons and loading states are actually visible |

---

## 6. Cross-cutting requirements

- **Presentation** — single mobile layout everywhere; device frame above 528px (see §0). No tablet or desktop compositions.
- **Dark/light** — `next-themes`, class strategy, system default, no flash (inline script)
- **i18n** — custom `[locale]` routing (az/en/ru) with static dictionaries, `hreflang` alternates, locale-aware number/date/currency (₼ AZN). English `en.json` is the typed reference — missing keys in `az`/`ru` fail the typecheck.
- **SEO** — per-route `generateMetadata`, JSON-LD (`Product`, `Offer`, `LocalBusiness`, `BreadcrumbList`), sitemap, robots, OG images
- **Accessibility** — WCAG 2.1 AA contrast, full keyboard paths, focus traps in sheets/dialogs, `aria-live` for filter result counts, semantic landmarks, visible focus rings
- **Performance** — RSC by default, `"use client"` only at leaves, `next/image`, route-level code splitting, `next/font` with `display: swap`

---

## 7. Scope — high-fidelity investor demo

The deliverable is a **presentation prototype**, not the full application: enough
screens, at enough quality, to convey the product vision to customers and
investors. Everything runs on mock data with simulated interaction.

**In scope:** splash · onboarding · home · search + filters · vehicle details ·
rental flow · booking calendar · seller profile · chat · favorites · user
profile · bottom navigation.

**Deferred:** admin console, seller dashboard, create/edit listing, parts and
services catalogs, notifications centre, settings, auth, saved searches, SEO
surfaces, error pages.

> The module 1 dataset already covers the deferred areas (admin queue, dashboard
> aggregates, parts, workshops). It stays in place — unused seed data costs
> nothing and means those screens can be built later without touching the model.

## 8. Module plan

Delivered module by module; each stops for approval before the next begins.

| # | Module | Screens | Status |
|---|---|---|---|
| 0 | Foundation — config, design tokens, fonts, theming, locale routing, device frame | — | ✅ delivered |
| 1 | Domain types & mock data | — | ✅ delivered |
| 2 | Design system & app shell — UI primitives, generated vehicle artwork, tab bar, headers, bottom sheets, page transitions, skeleton/empty states | Splash, Onboarding, Home, Search + filters, Vehicle details | ✅ delivered |
| 3 | Transaction & personal | Rental details, Booking calendar, Checkout, Confirmation, Seller profile, Chat, Favorites, User profile | |
