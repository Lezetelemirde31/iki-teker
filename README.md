# Iki Tekerli

A two-wheeler marketplace for Azerbaijan — buy, sell, service and rent motorcycles, scooters, electric vehicles and bicycles.

This repository is a **high-fidelity frontend prototype** built for customer and investor presentations. It runs entirely on mock data: there is no backend, database or authentication, and every interaction is simulated on the client.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Framer Motion · Lucide · next-themes

## Platform

Iki Tekerli is designed as a mobile application, so there is deliberately no desktop layout:

- **Below 528px** the app is full-bleed — what would ship to a phone.
- **At 528px and above** the identical UI is centred inside a device frame on an ambient backdrop, so it can be demoed on a laptop without pretending to be a desktop website.

## Languages

Azerbaijani (default), English and Russian, routed as `/az`, `/en`, `/ru`. `src/messages/en.json` is the typed reference dictionary — a key missing from `az.json` or `ru.json` fails the typecheck rather than rendering blank.

## Commands

```bash
npm run dev           # development server
npm run build         # production build
npm run typecheck     # TypeScript, no emit
npm run check:mocks   # referential integrity of the mock dataset
```

`check:mocks` validates every foreign key, arithmetic total and calendar/booking agreement across the seed data. Run it after changing anything under `src/mocks/`.

## Layout

```
src/
├─ app/[locale]/     routes (locale-segmented)
├─ components/       brand, layout, theme, i18n, ui
├─ i18n/             locale config, dictionaries, translator
├─ lib/              formatters, queries (mock data-access layer), demo clock
├─ messages/         az.json · en.json · ru.json
├─ mocks/            seeded datasets
└─ types/            domain model
```

## Notes

- The demo runs on a fixed clock (`src/lib/demo-clock.ts`, 27 July 2026) so relative timestamps and availability calendars look identical on every machine.
- Listing artwork is generated from a seed rather than fetched, so nothing can fail to load during a presentation.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full screen and component plan, and [docs/Iki-Tekerli_PRD_EN.md](docs/Iki-Tekerli_PRD_EN.md) for the product requirements.
