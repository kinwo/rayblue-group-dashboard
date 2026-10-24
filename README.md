# Rayblue Agency Group Dashboard

An interactive prototype of the group-level dashboard for **Rayblue Agency Group**, an Australian real estate group that runs individual agencies in each state and territory.

## Product brief

### Problem

The group manager oversees many agencies across Australia but has no single place to see how rental activity is trending across the group.

### Users

| User                        | Needs                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Group manager** (primary) | A group-wide view of rental activity across every agency, with the option to narrow it down by state or by agency. |

### Scope of the prototype

- **App shell**: a left drawer sidebar with one navigation item, **Rental Analytics**.
- **Rental Analytics page**:
  - Filters by **state** (NSW, VIC, QLD, WA, SA, TAS, ACT, NT), by **agency**, and by listing period (**daily**, **weekly**, **monthly**).
  - KPI tiles: new listings today, this week and this month, and the number of agencies.
  - Trend chart of new listings per day, week or month.
  - New listings by state, and a table of the top agencies.
- **Data**: synthetic, seeded into a local SQLite file. No real customer data.
- **Public**: no sign-in; the app shows aggregate counts only.

Full requirements and acceptance criteria: **[intent.md](intent.md)**. It is the source of truth for v1 scope.

### Out of scope (for now)

- Authentication and roles
- Editing listings or agencies
- Live integrations with listing portals
- Analytics beyond listing counts (vacancy, rent prices, days on market)
- Listing-level detail (addresses, rents, people)

### Domain glossary

| Term            | Meaning                                                                       |
| --------------- | ----------------------------------------------------------------------------- |
| **Group**       | Rayblue Agency Group, the parent organisation.                                |
| **State**       | An Australian state or territory. Each agency belongs to exactly one.         |
| **Agency**      | An individual Rayblue office that manages rental properties.                  |
| **Listing**     | A rental property advertised by an agency, counted on the date it was listed. |
| **Granularity** | The time bucket for a chart: daily, weekly (weeks start Monday) or monthly.   |

All dates are bucketed in the `Australia/Sydney` timezone.

## What the solution does

A Next.js web app with one page, **Rental analytics** (`/rental-analytics`; `/` redirects there). It reads a seeded SQLite file and shows, for the whole group or one state or agency:

- KPI tiles: new listings today, this week and this month (each against the previous period), and the number of agencies;
- a trend chart of new listings per day, week or month;
- new listings by state, and a sortable table of the top agencies.

Filters live in the URL (`?state=QLD&agencyId=29&granularity=weekly`), so every view can be bookmarked and shared. Invalid params fall back to their defaults. The only API is `GET /api/health`.

## Tech stack

| Concern   | Choice                                                   |
| --------- | -------------------------------------------------------- |
| Runtime   | Node.js 24, TypeScript (strict)                          |
| Framework | Next.js 16 with the App Router                           |
| Database  | SQLite (file-based) through Drizzle ORM                  |
| UI        | Tailwind CSS, shadcn/ui, shadcn charts (Recharts)        |
| Tests     | Jest, React Testing Library, fast-check (property-based) |

## Prerequisites

- **Node.js 24** and npm 10+ (`nvm use` reads `.nvmrc`). `better-sqlite3` ships prebuilt binaries for macOS, Linux and Windows; if none matches your platform, npm builds it, which needs Python 3 and a C++ toolchain.
- git. No database server, Docker, accounts or API keys are needed.
- Optional: Python 3.9+ to re-run the evidence oracle (`evidence/e2e/oracle.py`).

## Setup

From a clean checkout:

```bash
npm ci
```

```bash
npm run db:migrate && npm run db:seed
```

This creates `data/rayblue.db` (git-ignored) with 30 agencies and about 3,200 synthetic listings. Configuration is optional: every variable has a default, documented in [.env.example](.env.example). Copy it to `.env.local` only to override.

## Run

Development server:

```bash
npm run dev
```

Production build (what the evidence was captured against):

```bash
npm run build && npm start
```

Then open http://localhost:3000. Check the server is healthy:

```bash
curl -s http://localhost:3000/api/health
```

## Test and verify

The full verification gate, the same steps CI runs ([.github/workflows/ci.yml](.github/workflows/ci.yml)):

```bash
npm run lint && npm run typecheck && npm test
```

- `npm run lint`: ESLint, including the layer import rules (a wrong import fails).
- `npm run typecheck`: `tsc --noEmit` in strict mode.
- `npm test`: unit, property-based (fast-check), component (RTL) and data tests on in-memory SQLite. Tests do not need the seeded database or a running server. Add `-- --coverage` for a coverage report.

CI also runs a production build (reusing a cached `.next/cache`) and a parallel supply-chain job: `npm audit --omit=dev --audit-level=high`, `npm audit signatures`, and a CycloneDX SBOM of the production dependencies (`npm sbom --omit=dev --sbom-format=cyclonedx`), uploaded as the `sbom` workflow artifact.

## Example workflow

With the default seed (as-of **9:00 am, Sat 24 Oct 2026**, Sydney time):

1. Open http://localhost:3000. The page redirects to `/rental-analytics` and shows the whole group:
   - meta line: "All states and territories · Sample data · Updated 9:00 am, 24 Oct 2026";
   - KPI tiles: **10** new listings today, **692** this week, **2,586** this month, **30** agencies;
   - by state: NSW 589, VIC 479, QLD 419; the other five states and territories show 0.
2. Choose **QLD** in the state filter, then **Rayblue Townsville City** in the agency filter. The URL becomes `/rental-analytics?state=QLD&agencyId=29` and every figure narrows to that agency.
3. Choose **Weekly** to see weekly buckets (`&granularity=weekly`).
4. Health check input/output:

   ```
   $ curl -s http://localhost:3000/api/health
   {"status":"ok","version":"0.1.0","database":"ok"}
   ```

The seed is deterministic, so these numbers are the same on every machine. Screenshots of this workflow are in [evidence/e2e/shots/](evidence/e2e/shots/).

## Known limitations

- **Synthetic, partial data.** The seed covers only the last 30 days and only NSW, VIC and QLD ([ADR 0002](docs/adr/0002-prototype-seed-scope.md)). WA, SA, TAS, ACT and NT always show 0, and most weekly and monthly buckets and "vs previous" comparisons are 0 or "—".
- **Fixed as-of time.** "Today", "this week" and "this month" are relative to the seeded as-of time, not the real clock. More than 24 hours after it, the page shows a "figures may be out of date" warning. To get a current dataset, re-seed with `SEED_AS_OF` set to a recent time, for example `SEED_AS_OF=2026-10-25T09:00:00+11:00 npm run db:seed`; the example figures above then change.
- **No sign-in, read-only.** The app is public and shows aggregate counts only. There is no editing and no live listing-portal integration. The app limits requests per client IP in memory, per process ([ADR 0004](docs/adr/0004-in-app-rate-limiting.md)); the host must provide TLS and a reverse proxy that sets `X-Forwarded-For` ([docs/runbook.md](docs/runbook.md)).
- **Counts only.** No vacancy, rent prices, days on market or listing-level detail.
- **E2E tests are not automated yet.** [e2e-test-plan.md](e2e-test-plan.md) describes a Playwright suite, but Playwright is not a dependency. The E2E run in the evidence pack was done by hand against a production build, with an independent SQL oracle for the expected figures.
- **Browser support** was checked in Chromium at desktop and mobile widths only; Firefox, Safari and Edge are untested.

## Evidence pack

Everything is in **[evidence/](evidence/)**:

| Item                                                                                          | What it shows                                                                                               |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [evidence/agentic-workflow.md](evidence/agentic-workflow.md)                                  | How the prototype was built with AI agents, step by step                                                    |
| [evidence/design.md](evidence/design.md)                                                      | Architecture, data flow and design decisions                                                                |
| [evidence/decisions.md](evidence/decisions.md)                                                | Key decisions and trade-offs                                                                                |
| [evidence/verify.md](evidence/verify.md)                                                      | Verification results                                                                                        |
| [evidence/operate.md](evidence/operate.md)                                                    | How to operate the app                                                                                      |
| [evidence/e2e/shots/](evidence/e2e/shots/)                                                    | 22 screenshots of the E2E run: defaults, filters, keyboard focus, tooltips, sorting, mobile and breakpoints |
| [evidence/e2e/http-checks.txt](evidence/e2e/http-checks.txt)                                  | HTTP checks: redirects, 404s, 405s, health and security headers                                             |
| [evidence/e2e/oracle.py](evidence/e2e/oracle.py), [expected.json](evidence/e2e/expected.json) | Independent SQL oracle for the expected figures, and its output                                             |
| [evidence/e2e/inspect.js](evidence/e2e/inspect.js), `inspect-*.json`                          | In-page script and the figures it read from the rendered page, to compare with the oracle                   |

Related: requirements and acceptance criteria in [intent.md](intent.md), the E2E plan in [e2e-test-plan.md](e2e-test-plan.md), and decision records in [docs/adr/](docs/adr/).

## Scripts

| Script                        | Purpose                                                |
| ----------------------------- | ------------------------------------------------------ |
| `npm run dev`                 | Start the Next.js dev server                           |
| `npm run build` / `npm start` | Production build and serve                             |
| `npm run lint`                | ESLint                                                 |
| `npm run typecheck`           | `tsc --noEmit`                                         |
| `npm test`                    | Run all Jest tests                                     |
| `npm run test:watch`          | Jest in watch mode                                     |
| `npm run db:generate`         | Generate a Drizzle migration from schema changes       |
| `npm run db:migrate`          | Apply migrations to the SQLite file                    |
| `npm run db:seed`             | Fill the database with synthetic agencies and listings |

## Documentation map

Read in this order; each step goes one level deeper.

1. **README.md** (this file): what the product is and how to run it.
2. **[intent.md](intent.md)**: v1 requirements and acceptance criteria.
3. **[AGENTS.md](AGENTS.md)**: the short rule set for anyone (human or AI agent) changing the code.
4. **[ENGINEERING.md](ENGINEERING.md)**: architecture, engineering decisions, practices and the testing strategy.
5. **[DESIGN.md](DESIGN.md)**: the UI design system (tokens, typography, layout, components, charts).
6. **`docs/`**: detailed, topic-specific notes and decision records, added as features grow.

## Future improvements

- [ ] Add user auth, JWT sessions token
- [ ] API will verify Auth JWT session
- [ ] Add DB field level or row level security
- [ ] Deterministic E2E Playwright tests
- [ ] Improve the data model e.g PropertyAddress model
- [ ] Consider Bot and Spam protection
