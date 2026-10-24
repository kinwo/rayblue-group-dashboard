# Engineering Guide

How the Rayblue Agency Group Dashboard is built and why. For the product brief see [README.md](README.md); for the short rule set see [AGENTS.md](AGENTS.md).

## 1. Principles

- **Clean Code.** Small functions that do one thing, intention-revealing names, no dead code, no commented-out code. Comments explain *why*, never *what*.
- **DRY.** Every piece of knowledge has one home: the state list, date bucketing, chart colours and query logic are each defined once and imported everywhere else. Duplicate on the second occurrence only if the two uses are likely to diverge; extract on the third at the latest.
- **Layered architecture.** Each layer has one job and depends only on the layers below it (see §3).
- **Pure core, thin edges.** Business rules live in pure functions that are trivial to test; I/O (database, Next.js request handling) stays at the edges.
- **Type safety end to end.** Types flow from the Drizzle schema through services to components. No `any`; use `unknown` and narrow.
- **Keep the prototype simple.** Prefer the boring option. Add a dependency only when it removes more code than it adds.

## 2. Tech stack decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Framework | Next.js (latest), App Router | Server Components fetch data directly from services without an API layer; file-based routing fits a dashboard shell. |
| Language / runtime | TypeScript strict, Node.js 24 | Current LTS; native support for modern ES features. Pinned in `.nvmrc` and `package.json#engines`. |
| ORM | Drizzle ORM | Schema-as-TypeScript gives inferred row types; SQL-like query builder keeps aggregation queries readable. |
| Database | SQLite file (`better-sqlite3` driver) | Zero setup for a prototype, fast, and runs in-memory for tests. Path from `DATABASE_URL` (default `./data/rayblue.db`, git-ignored). |
| Styling | Tailwind CSS + CSS Modules | Tokens and utilities in one place (`globals.css`); each component composes them with `@apply` in its own `*.module.css` under semantic class names ([ADR 0005](docs/adr/0005-css-modules-for-component-styles.md)). |
| Components | shadcn/ui | Accessible Radix primitives copied into the repo, so we own and can adjust them. Sidebar, Select, Tabs, Card. |
| Rate limiting | rate-limiter-flexible (in memory) | Per-client limits in `src/proxy.ts`, tested with the app; same interface for a shared store later ([ADR 0004](docs/adr/0004-in-app-rate-limiting.md)). |
| Charts | shadcn charts (Recharts) | Matches shadcn theming via CSS variables; enough for bar and line charts. |
| Unit / component tests | Jest + React Testing Library | Standard for React; `next/jest` handles the SWC transform and path aliases. |
| Property-based tests | fast-check | Finds edge cases in date bucketing and aggregation that example tests miss (month ends, DST changes, leap years). |

Record any new significant decision as a short ADR in `docs/adr/NNNN-title.md` (context, decision, consequences).

## 3. Architecture

### Folder structure

```
src/
  app/          Routes, layouts, loading/error states. Thin: read params, call a service, render components.
  components/   React components.
    ui/         shadcn/ui primitives (generated; edit sparingly).
    layout/     App shell: sidebar drawer, header.
    analytics/  Feature components: listings chart, granularity switch, filters.
  services/     Business logic and use cases, e.g. getListingCounts(filter, granularity). No React, no Next.js.
  data/         Persistence: Drizzle schema, migrations, repositories (query functions), seed script.
  clients/      Configured external clients, e.g. the Drizzle/SQLite db client singleton.
  utils/        Pure, framework-free helpers: date bucketing, formatting, constants.
docs/           Topic notes and ADRs.
```

### Dependency rule

```
app ──► components ──► utils
 │
 └────► services ──► data ──► clients
            └──────► utils
```

- A layer may import only from layers to its right/below. Never upward.
- `components` never import `data` or `clients`; they receive data as props from `app`.
- `services` never import React or `next/*`.
- `utils` imports nothing from the project.
- Import through the `@/` alias (`@/services/listings`), not long relative paths.

### Data model

| Table | Columns (key ones) |
| --- | --- |
| `agencies` | `id`, `name`, `state` (enum: NSW, VIC, QLD, WA, SA, TAS, ACT, NT), `suburb`, `createdAt`, `updatedAt` |
| `listings` | `id`, `agencyId` → `agencies.id`, `subNumber`, `streetNumber`, `street`, `suburb`, `postcode`, `state`, `propertyType`, `beds`, `baths`, `rentPerWeek`, `propertyManager`, `status` (`ListingStatus`: active, leased, withdrawn), `listedDate` (UTC epoch ms), `createdAt`, `updatedAt` |
| `dataset_meta` | single row: `asOf` (the dataset's as-of time), `seed`, `generatedAt` |

Indexes `listings(agencyId, listedDate)` and `listings(listedDate)` for the time-series queries. Filters use the agency's state; `listings.state` mirrors it and the seed test checks that. Address, rent and property-manager columns never leave `src/data` (AC-PRV-1): repositories return only ids, names, states and timestamps.

### Request flow: Rental Analytics

1. `src/app/rental-analytics/page.tsx` (Server Component) reads `granularity`, `state` and `agencyId` from `searchParams`, validated with a schema (zod) and given defaults.
2. It calls `getListingCounts()` in `src/services`.
3. The service asks a repository in `src/data` for listings in range, then buckets them with `src/utils/date-buckets` into a continuous series (empty buckets filled with `0`).
4. The page passes the series to `ListingsChart` (Client Component) in `src/components/analytics`.
5. Filters and the granularity switch update the URL search params, so every view is shareable and back-button friendly. No client-side global state.

## 4. Practices

### Code

- **Naming:** files `kebab-case.ts(x)`; components `PascalCase`; functions and variables `camelCase`; constants `SCREAMING_SNAKE_CASE`; types and interfaces `PascalCase` with no `I` prefix.
- **Server first:** components are Server Components unless they need state, effects or browser APIs; mark those `"use client"` and keep them small.
- **Validate at boundaries:** parse search params, env vars and seed input once at the edge; trust types inside.
- **Errors:** throw typed errors from services; handle them in route `error.tsx` boundaries. Never swallow errors silently.
- **Dates:** store UTC; bucket and display in `Australia/Sydney` using the single helper in `src/utils`. Never call `new Date()` inside business logic; pass "now" in so it can be tested.
- **Styling:** each component's styles live in a sibling `*.module.css` built from Tailwind token utilities with `@apply`; TSX uses `styles.name` and `data-*` attributes for state. No utility strings in `className` (lint enforces it; `sr-only` is the exception), no inline hex colours, no global CSS outside `globals.css`.
- **Accessibility:** every chart has a visible title and a text summary or table alternative; all controls are keyboard reachable and labelled.

### Workflow

- Branch from `main`; small, focused commits using Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`).
- Before pushing: `npm run lint && npm run typecheck && npm test` must pass.
- Schema change → edit `src/data/schema.ts` → `npm run db:generate` → commit the generated migration alongside the schema change.
- Update this file or add an ADR when you change an architectural decision; update README when you change product scope.

## 5. Testing strategy

Tests sit next to the code they cover as `*.test.ts` / `*.test.tsx`.

| Layer | Test type | Tools | What to assert |
| --- | --- | --- | --- |
| `utils` | Unit + property-based | Jest, fast-check | Pure behaviour across the whole input space. |
| `services` | Unit + property-based | Jest, fast-check, in-memory SQLite | Use-case results given seeded data; invariants over generated data. |
| `data` | Integration | Jest, in-memory SQLite with migrations applied | Queries return the right rows and respect filters. |
| `components` | Component | React Testing Library, `jest-environment-jsdom` | What the user sees and can do: labels, roles, interactions. Query by role/label, not by class or test id. |
| `app` | Smoke (optional) | RTL | Pages render with the default params. |

### Property-based tests

Use fast-check for anything that transforms collections of dates or counts. Core invariants for listing counts:

- **Conservation:** the sum of all bucket counts equals the number of listings in range.
- **Exclusivity:** each listing falls into exactly one bucket.
- **Continuity:** buckets are contiguous and ordered, with no gaps or duplicates, including across DST changes and month/year ends.
- **Filter monotonicity:** adding a filter (state, agency) never increases any bucket's count.
- **Granularity consistency:** daily counts summed per week equal the weekly counts; weekly-to-monthly is not assumed (weeks span months).

Keep generators in `src/test/arbitraries.ts` so they are shared (DRY). When fast-check finds a failure, add the shrunk counterexample as a regular example test.

### Rules

- Write or update tests in the same change as the code.
- Mock only at the edges (clock, external services). Use a real in-memory SQLite instead of mocking Drizzle.
- Tests must be deterministic: fixed clock, seeded randomness.
- Coverage is a signal, not a target; aim for full coverage of `utils` and `services`.
