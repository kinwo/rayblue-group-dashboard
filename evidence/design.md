# Design

How the Rayblue Agency Group **Rental analytics** dashboard (v1 prototype) is built and why. The requirements are in [intent.md](../intent.md), the rules in [ENGINEERING.md](../ENGINEERING.md), the visual system in [DESIGN.md](../DESIGN.md), and the decision records in [docs/adr/](../docs/adr/).

## 1. Architecture overview

The app is one Next.js 16 App Router application on Node.js 24. A read-only SQLite file is shipped with each release. There is no separate API tier: Server Components call the service layer directly, and the only HTTP API is `GET /api/health`.

```
Browser ──HTTPS──► proxy.ts ──► App Router (Server Components) ──► services ──► data ──► clients ──► SQLite (read-only file)
   ▲              (method gate,     │ page.tsx / layout.tsx             │            │
   │               nonce CSP,       ▼                                   ▼            ▼
   └── HTML + RSC  headers)    components (props only)              utils (pure: dates, formatting, params, headers, logger)
```

Code is split into layers, and each layer may import only from the layers below it. ESLint `no-restricted-imports` enforces this, so a wrong import fails `npm run lint` (AC-MNT-1).

| Layer        | Folder           | Responsibility                                                                                                           | May import                              |
| ------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Routes       | `src/app`        | Read and validate search params, call a service, render. Also error, loading and not-found boundaries and `/api/health`. | components, services, utils             |
| UI           | `src/components` | React components that receive data as props. `ui/` holds the vendored shadcn primitives.                                 | utils, plus `import type` from services |
| Use cases    | `src/services`   | `getRentalAnalytics`, `checkHealth`. No React and no Next.js.                                                            | data, utils                             |
| Persistence  | `src/data`       | Drizzle schema, migrations, repository, seed, start-up checks                                                            | clients, utils                          |
| Clients      | `src/clients`    | The read-only SQLite connection and the validated env                                                                    | external packages only                  |
| Pure helpers | `src/utils`      | Sydney date bucketing, formatting, search-param parsing, states, typed errors, security headers, logger                  | nothing in the project                  |

## 2. Data flow (one page request)

1. **`src/proxy.ts`** runs first:
   - It rejects any method other than `GET` or `HEAD` with `405`. The response is JSON under `/api` and plain text elsewhere.
   - It generates a fresh nonce and builds the CSP with `buildContentSecurityPolicy` from `src/utils/security-headers.ts`.
   - It passes the nonce to rendering in the `x-nonce` request header.
2. **`src/app/layout.tsx`** awaits `connection()`, so every route renders per request. It also reads the nonce and gives it to `NonceProvider`, which stamps it on runtime `<style>` tags.
3. **`src/app/rental-analytics/page.tsx`** awaits `searchParams` and parses them with `parseAnalyticsSearchParams` (`src/utils/search-params.ts`, zod). Each param falls back to its default on its own and the parser never throws (AC-FLT-8, AC-SEC-2). The page then calls `loadRentalAnalytics(filters, Date.now())`; the server clock is injected only at this edge.
4. **`src/services/rental-analytics.ts`**:
   - Loads the dataset meta (the as-of time) and the agencies.
   - Cross-validates the filters: an agency outside the selected state is dropped and the state is kept (AC-FLT-9).
   - Makes **one bounded read** of listing times, covering the widest window the page needs and capped at the as-of time.
   - Aggregates in memory with the pure helpers in `rental-analytics.aggregate.ts` and `src/utils/date-buckets.ts`.
5. **`src/data/listing-repository.ts`** runs Drizzle queries with bound parameters on the read-only connection. It returns only `{ agencyId, listedDate }`, agency records and the meta row. Addresses, rents and property-manager names never leave `src/data` (AC-PRV-1).
6. **The page renders** the KPI tiles, trend chart, state bars and agencies table from the `RentalAnalyticsView` props.
7. **Client components** change filters by pushing new search params with `toSearchParams`. Every view is therefore a shareable URL, and Back and Forward restore it (AC-FLT-5..7). The only client state is the table's local sort order.

**Failure path:** any SQLite error is mapped to `DataUnavailableError` in `src/data` and propagates unchanged through the service. Next renders `src/app/error.tsx`, which shows a fixed message and a Retry button (`retry()`) and never renders the error itself (AC-STE-3). `instrumentation.ts` `onRequestError` logs one structured line for the failure.

## 3. Component boundaries

**Contracts first.** The lead committed the shared types before any parallel work started, so the three workstreams could build against them independently:

- `src/data/repository.types.ts`: `ListingRepository`, `AgencyRecord`, `ListingTime`, `DatasetMeta`
- `src/services/rental-analytics.types.ts`: `RentalAnalyticsView`, `AgencyRow`, `TrendPoint`, `GetRentalAnalytics`
- `src/utils/errors.ts`: `DataUnavailableError`, `DataIntegrityError`
- `src/utils/states.ts` and `src/utils/granularity.ts`

**Single homes (DRY):**

- Sydney time: `date-buckets.ts`
- Display formatting: `format.ts`
- States: `states.ts`
- Chart colours: `chart-colors.ts`
- Security policy: `security-headers.ts`
- Type-scale names for `cn`: the `TYPE_SCALE` constant in `cn.ts`

**UI composition:**

- Shell: `AppShell` is the chrome sidebar; it becomes a sheet below 808px.
- Page: `PageHeader`, then `Filters`, then `KpiTiles`, `TrendChart`, `StateBars` and `TopAgenciesTable`, each in an `AnalyticsCard`.
- Feedback views: `StatusView` and `RetryErrorView` are shared by the error, global-error and not-found pages.

**Server and client split:** components are Server Components by default. Only the interactive pieces are client components: the filters, the chart, table sorting, the mobile navigation button and the error boundaries.

## 4. Data model

| Table          | Columns                                                                                                                                                                                                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agencies`     | `id`, `name` (unique; fictitious "Rayblue …"), `state` (NSW…NT enum), `suburb`, `created_at`, `updated_at`                                                                                                                                                                                   |
| `listings`     | `id`, `agency_id` → agencies, `sub_number`, `street_number`, `street`, `suburb`, `postcode`, `state`, `property_type`, `beds`, `baths`, `rent_per_week`, `property_manager`, `status` (`ListingStatus`: active, leased, withdrawn), `listed_date` (UTC epoch ms), `created_at`, `updated_at` |
| `dataset_meta` | one row: `as_of`, `seed`, `generated_at`                                                                                                                                                                                                                                                     |

**Indexes:** `listings(agency_id, listed_date)` and `listings(listed_date)`.

**Counting rule:** a listing counts once, in the Sydney bucket that contains its `listed_date`, whatever its status. Filters use the **agency's** state.

**Seed (ADR 0002):**

- Deterministic for a given `SEED` and `SEED_AS_OF`. The default as-of time is 9:00 am Sat 24 Oct 2026 AEDT.
- 30 Sydney days of listings: 30 agencies (NSW 12, VIC 10, QLD 8) and 3,214 listings.
- Weekday pattern: weekends are quieter.

## 5. Key trade-offs

| Decision                         | Chosen                                                                                            | Given up                                             | Why                                                                                                                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rendering                        | Every route dynamic. `cacheComponents` and PPR are off and the root layout awaits `connection()`. | Static shells, CDN caching, partial prerendering     | A per-request CSP nonce cannot reach a prerendered shell. In the first production build every script was blocked and the page never hydrated (ADR 0003). The page reads search params anyway and the dataset is small. |
| CSP mechanism                    | Nonce plus `'strict-dynamic'`                                                                     | Hash-based SRI (`experimental.sri`)                  | SRI does not cover Next's inline RSC scripts. A nonce also covers the runtime `<style>` tags from Radix and react-remove-scroll.                                                                                       |
| `style-src-attr 'unsafe-inline'` | Allowed for style **attributes** only                                                             | A fully strict style policy                          | Recharts and the sidebar position elements with inline `style`. `<style>` elements still need the nonce.                                                                                                               |
| Aggregation                      | One bounded read, aggregated in memory in pure functions                                          | SQL `GROUP BY` per widget                            | Logic is testable with fast-check without a database; one query per page; the data is small. Revisit if listings reach millions.                                                                                       |
| Database                         | Read-only SQLite file shipped with the release                                                    | A managed database                                   | Zero infrastructure, immutable releases, and code and data roll back together. It does not scale to live ingestion.                                                                                                    |
| Seed scope                       | 30 days, NSW/VIC/QLD (product-owner decision, ADR 0002)                                           | The 24-month, 8-state dataset in the original intent | Smaller and faster, but Weekly and Monthly trends and "vs previous" are mostly 0 or "—" by design.                                                                                                                     |
| Time library                     | `date-fns` + `@date-fns/tz` (ADR 0001)                                                            | Raw `Intl` arithmetic, or `Temporal`                 | DST days are 23 or 25 hours long. `Temporal` is not available unflagged in Node 24.                                                                                                                                    |
| Filters                          | URL search params only                                                                            | Client state store                                   | Shareable links and Back/Forward come for free, with no state synchronisation bugs.                                                                                                                                    |
| Error boundary                   | Next 16.4 `retry()`                                                                               | `reset()` + `router.refresh()`                       | The installed Next docs say `retry()` re-fetches and re-renders the segment.                                                                                                                                           |

## 6. Security and privacy considerations

The app is **public and read-only**, with no sign-in. Every endpoint is treated as hostile input (intent §4).

**No write paths (AC-SEC-1):**

- Only `GET` route handlers exist.
- The proxy rejects any method other than `GET` or `HEAD` with `405`.
- There are no server actions and no forms that post to the server.

**Input (AC-SEC-2):**

- Search params are parsed with zod at the page boundary. Values that are oversized, arrays or malformed fall back to defaults and are never echoed back.
- Query ranges are fixed by granularity, so no request can trigger unbounded work.

**Database (AC-SEC-3):**

- The runtime opens SQLite with `readonly` and `fileMustExist`; only the build-time `db:migrate` and `db:seed` scripts write to it.
- All queries go through Drizzle with bound parameters.

**Headers (AC-SEC-4):**

- A per-request nonce CSP: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, and same-origin images, fonts and connections.
- HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a `Permissions-Policy` that disables camera, microphone and geolocation.
- `poweredByHeader: false`.

**No leakage (AC-SEC-5):**

- Typed errors carry fixed, safe messages, and the error views never render the error object.
- The logger accepts only allow-listed fields. For an error it writes the name, the message only for the app's own typed errors, and a driver code such as `SQLITE_ERROR`; never a stack trace, SQL or path.
- `InvalidEnvError` lists the names of invalid variables, never their values.

**Secrets (AC-SEC-6):** none exist. The three env vars, all safe to commit, are documented in `.env.example`. CI runs GitGuardian and `npm audit --omit=dev --audit-level=high` (AC-SEC-7).

**Privacy (AC-PRV-1..5):**

- Services return only counts, agency and state names, and ids.
- Listing addresses, rents and the fictitious property-manager names exist only inside `src/data`.
- "Sample data" appears on every page.
- No cookies: the shadcn sidebar's `sidebar_state` cookie and its Cmd/Ctrl+B shortcut were removed.
- No third-party scripts, and fonts are self-hosted through `next/font`.

**Open:** before any real data is loaded, the app needs sign-in and roles, a privacy impact assessment and a log retention policy (intent §9).

## 7. Technology choices

| Concern    | Choice                                                                        | Notes                                                                                           |
| ---------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Runtime    | Node.js 24 (`.nvmrc`, `engines >=24 <25`)                                     | Current LTS                                                                                     |
| Framework  | Next.js 16.4 App Router, React 19.3                                           | `proxy.ts` replaces middleware. `instrumentation.ts` runs start-up checks and `onRequestError`. |
| Language   | TypeScript strict                                                             | No `any`. Types flow from the Drizzle schema to the components.                                 |
| Data       | SQLite via `better-sqlite3`, Drizzle ORM and drizzle-kit migrations           | In-memory SQLite in tests, never mocks                                                          |
| Validation | zod 4                                                                         | Search params, env, seed options                                                                |
| Dates      | `date-fns` 4 + `@date-fns/tz`                                                 | `src/utils/date-buckets.ts` only                                                                |
| UI         | Tailwind CSS 4, shadcn/ui (Radix), lucide icons, Recharts via shadcn chart    | Cirrus tokens in `globals.css`; dark mode follows `prefers-color-scheme`                        |
| Tests      | Jest (node and jsdom projects), React Testing Library, user-event, fast-check | `*.test.ts` runs in Node, `*.test.tsx` in jsdom                                                 |
| CI         | GitHub Actions on Node from `.nvmrc`                                          | lint, typecheck, tests with coverage, migrate and seed, build, `npm audit`                      |

## 8. Likely production and cloud shape

The prototype is hosting-agnostic. Once real data and users arrive, the most likely next step is:

```
Users ──► CDN / WAF (TLS, rate limits, GET/HEAD only, header size caps)
            └──► Next.js on a Node 24 serverless or container platform (e.g. Vercel Fluid Compute, AWS ECS/Fargate, Cloud Run)
                    ├── read path ──► managed Postgres read replica (e.g. Neon, RDS, Cloud SQL)
                    │                   └── pre-aggregated daily counts table (refreshed by ingestion)
                    ├── logs (JSON stdout) ──► log drain (Datadog / CloudWatch / OpenTelemetry)
                    └── /api/health ──► uptime monitor and load-balancer health check
Ingestion (separate service, write credentials) ──► primary DB ──► nightly or streaming roll-up
Identity provider (OIDC) for sign-in and state/agency roles (intent §9)
```

What changes and what stays the same:

- **Database:** SQLite is replaced by a managed Postgres read replica behind the same `ListingRepository` interface, so services and components do not change. Only `src/clients/db.ts` and the repository's queries move.
- **Aggregation:** counting moves to a pre-aggregated `daily_listing_counts(agency_id, sydney_date, count)` table. Weekly and monthly buckets are then sums of at most 24 months × agencies rows, rather than listing scans.
- **Secrets:** the database URL with read-only credentials comes from the platform's secret store or OIDC-issued credentials; it is still validated at start-up by `src/clients/env.ts`.
- **Caching:** a short per-URL cache becomes possible only if the CSP changes to hashes or the shell stays dynamic. Today correctness and a strict CSP win over caching.
- **Edge protection** that the app relies on but doesn't implement: rate limiting, a WAF, method filtering at the edge and request-size caps ([docs/runbook.md](../docs/runbook.md)).
- **Releases:** immutable versioned deployments with one-step rollback (for example instant rollback or a previous task definition). With a managed database, data no longer rolls back with code, so migrations must be backward compatible for one release.
