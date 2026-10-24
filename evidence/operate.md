# Operate

How to run the Rayblue Group Dashboard, see what it is doing, configure it, and keep it up when things fail. The day-2 procedures (deploy, health check, rollback, incident table) are in [docs/runbook.md](../docs/runbook.md); this file is the overview.

## 1. How to run the solution

Prerequisite: Node.js 24. `nvm use` reads `.nvmrc`; `package.json#engines` is `>=24 <25`.

**Local development:**

```bash
npm ci
```

```bash
npm run db:migrate && npm run db:seed
```

```bash
npm run dev
```

Open http://localhost:3000, which redirects to `/rental-analytics`.

**Production build, as shipped:**

```bash
npm run db:migrate && npm run db:seed && npm run build
```

```bash
npm start
```

**Quick status checks:**

```bash
curl -i http://localhost:3000/api/health
```

```bash
curl -sI "http://localhost:3000/rental-analytics?state=VIC&granularity=weekly"
```

The first command should return `200 {"status":"ok","version":"0.1.0","database":"ok"}`. The second should show the `Content-Security-Policy` header with a nonce, HSTS, `nosniff`, Referrer-Policy and Permissions-Policy, and no `X-Powered-By` or `Set-Cookie`.

**Seed options:**

- `SEED`: a fixed PRNG seed, default `20261024`.
- `SEED_AS_OF`: an ISO date-time with offset, default `2026-10-24T09:00:00+11:00`.

The same pair always produces the same dataset: 30 agencies across NSW, VIC and QLD and 30 days of listings.

## 2. Logs and status

**Logs:** one JSON object per line on stdout (`src/utils/logger.ts`). Fields are allow-listed: `time`, `level`, `msg`, `route`, `method`, `status`, `durationMs`, `reason`, `version`, `digest`, `error`. Errors are reduced to `{ name, message?, code? }`: the message appears only for the app's own typed errors, `code` holds a driver code such as `SQLITE_BUSY` or `ENOENT`, and stack traces are never written. Request bodies, headers, cookies and personal data have no field to go into (AC-REL-7, AC-SEC-5).

| `msg`                                     | Level        | When                                                                                                                                    |
| ----------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `startup_check_passed`                    | info         | Server start: env, DB file and migrations are OK (includes `version`)                                                                   |
| `startup_check_failed`                    | error        | Server start failed; `reason` is `invalid_env`, `database_missing`, `database_unreadable` or `migration_mismatch`. The process exits 1. |
| `request`                                 | info / error | Every `/api/*` request, with `route`, `method`, `status` and `durationMs`                                                               |
| `request_failed`                          | error        | Any server render or route error, from `onRequestError`, with route, status, error name or code and the `digest` the client saw         |
| `Migrations applied.` / `Dataset seeded.` | info         | Build-time scripts                                                                                                                      |

Illustrative shape of an outage line, with the DB file removed. The exact `code` depends on how the driver failed, for example `ENOENT` or `SQLITE_CANTOPEN`:

```json
{
  "time": "2026-10-24T00:12:03.120Z",
  "level": "error",
  "msg": "request_failed",
  "route": "/rental-analytics",
  "digest": "2817…",
  "error": {
    "name": "DataUnavailableError",
    "message": "The data source is unavailable.",
    "code": "ENOENT"
  }
}
```

**Status:**

- `GET /api/health` is the single status signal. It reads the database (`ping`) on every call and is sent `Cache-Control: no-store`.
- It returns `200 {"status":"ok","version","database":"ok"}`, or `503 {"status":"error","version","database":"unavailable"}` when the database cannot be read.
- Use it for load-balancer health checks, uptime monitors and post-deploy checks.

**Data freshness:** the page header always shows "Updated <time>, <date>" (the dataset's as-of time). When the server clock is more than 24 hours past it, a warning alert says the figures may be out of date (AC-HDR-2).

**Gap:** page renders are logged only when they fail (`request_failed`). There is no per-request access-log line with duration for pages yet; that comes from the host or proxy access logs.

## 3. Configuration and secrets

**Environment.** Validated once with zod in `src/clients/env.ts`, at start-up and in the CLI scripts. Documented in [.env.example](../.env.example):

| Variable             | Default                | Notes                                                                                   |
| -------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | `./data/rayblue.db`    | Path to the SQLite file. The runtime opens it read-only and requires the file to exist. |
| `APP_VERSION`        | `package.json` version | Reported by `/api/health`; set it to the release tag                                    |
| `LOG_LEVEL`          | `info`                 | `debug`, `info`, `warn` or `error`                                                      |
| `SEED`, `SEED_AS_OF` | see §1                 | Seed script only                                                                        |

**Secrets:**

- **There are none in v1.** The app is public, read-only and uses a local file, so every variable is safe to commit. `.env*` is git-ignored except `.env.example`.
- An invalid value fails start-up and lists the variable **names** only, never their values.
- GitGuardian scans every PR, and CI fails on high or critical `npm audit` findings.

**With a real database:**

- The connection string becomes a secret, held in the platform's secret store (for example Vercel environment variables, AWS Secrets Manager or GCP Secret Manager) and injected as an env var.
- It should use **read-only** database credentials, or short-lived OIDC-issued credentials where the platform supports them.
- It is never baked into the build. The same zod validation applies at start-up.

**Build-time vs runtime:**

- `db:migrate` and `db:seed` are the only writers, and they run during the build.
- The running app never migrates or writes (AC-REL-3, AC-SEC-3).

## 4. Failure modes

| Failure                                              | What the user sees                                                                                      | What the system does                                                                                                        | Signal                                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| DB file missing at start                             | — (no server)                                                                                           | Exits 1 before serving                                                                                                      | One `startup_check_failed` line, `reason: database_missing`                       |
| DB on the wrong migration                            | —                                                                                                       | Exits 1                                                                                                                     | `reason: migration_mismatch`                                                      |
| Invalid env (e.g. `LOG_LEVEL=loud`)                  | —                                                                                                       | Exits 1                                                                                                                     | `reason: invalid_env`, variable names only                                        |
| DB removed, unreadable, locked or corrupt at runtime | "We can't load the figures right now" with **Retry**; no stack, SQL or path                             | The driver error becomes `DataUnavailableError` and the connection is reset; the next call reconnects once the file is back | `request_failed` with `DataUnavailableError` and its code; health returns **503** |
| `dataset_meta` row missing                           | The same error view                                                                                     | `DataIntegrityError`                                                                                                        | `request_failed`                                                                  |
| Server render fails in the root layout               | `global-error.tsx` renders the same Retry view inside its own `<html>`                                  | —                                                                                                                           | `request_failed`                                                                  |
| Server or network unreachable during a filter change | **Not verified.** Next may fall back to a full page load, which then shows the browser's own error page | —                                                                                                                           | Host or proxy logs; covered by the E2E plan                                       |
| Unknown page                                         | "Page not found" with a link back, HTTP 404                                                             | —                                                                                                                           | —                                                                                 |
| Unknown or unavailable API endpoint                  | JSON `404`                                                                                              | Catch-all `/api/[...path]`                                                                                                  | `request` log, status 404                                                         |
| POST, PUT, DELETE or another write method            | `405` with `Allow: GET, HEAD`                                                                           | The proxy rejects it before routing (no write paths)                                                                        | —                                                                                 |
| Malformed, oversized or hostile URL params           | The default view, HTTP 200, input never echoed                                                          | Each param falls back on its own; query ranges are fixed                                                                    | —                                                                                 |
| Stale dataset (> 24 h)                               | Warning alert above the figures                                                                         | Figures still shown                                                                                                         | —                                                                                 |
| Scope with no listings                               | Zeros and a flat chart; an empty-state row in the table                                                 | Not treated as an error                                                                                                     | —                                                                                 |
| CSP blocks a script                                  | The page renders but doesn't respond to clicks                                                          | Prevented by rendering every route dynamically so every script gets the nonce (ADR 0003)                                    | Browser console                                                                   |

## 5. Rollback and degrade thinking

**Degrade rather than fail:**

- The data layer is the only thing that can fail at request time, and it fails **closed**: a plain error view, a 503 from health, a structured log line, and no partial or wrong figures.
- Recovery needs no restart. Restore the file, then Retry or the next request reconnects, because `getDb()` checks the file's inode on every call.
- The stale-data alert degrades honestly: old figures stay visible but are labelled.

**Fail fast at start:** a release with bad config, a missing DB or a migration mismatch never starts serving. That makes a bad deploy obvious, and safe to roll back before traffic arrives.

**Rollback:**

- Releases are immutable, versioned bundles that contain their own seeded DB. Code and data roll back **together** in one step: point `current` at the previous release and restart (runbook).
- There is no state to migrate down, because the runtime never writes.

**Blast radius:**

- Read-only DB, GET/HEAD only, no cookies, no sessions and no third-party calls. A compromised request cannot change data or reach other systems.
- The remaining risk is load: rate limiting and a WAF must sit in front (runbook › Host-level protection).

**Once there is a shared, live database,** rollback no longer reverts data:

- Migrations must be expand/contract (backward compatible for one release).
- Health would become "degraded" rather than "unavailable" if a replica lags.
- A last-known-good cache of the aggregate view could keep serving labelled-stale figures during a database outage.

## 6. Local-to-cloud considerations

| Concern                   | Local / prototype                              | Cloud                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compute                   | One `next start` process                       | Node 24 serverless or containers (e.g. Vercel Fluid Compute, Cloud Run, ECS/Fargate), several instances                                                                                                                                                                                                                                                                                       |
| Database                  | A read-only SQLite file shipped in the release | A managed Postgres read replica behind the same `ListingRepository` interface, plus a pre-aggregated daily counts table. SQLite on ephemeral serverless disks works only while the file ships read-only in the bundle.                                                                                                                                                                        |
| Ingestion                 | `npm run db:seed`                              | A separate service with write credentials, on a schedule or streaming. It updates `dataset_meta.as_of` so the freshness alert stays meaningful.                                                                                                                                                                                                                                               |
| Config and secrets        | `.env.local`, nothing secret                   | The platform secret store, read-only DB credentials, the same start-up validation                                                                                                                                                                                                                                                                                                             |
| TLS, rate limits, WAF     | None (localhost)                               | The cloud platform's WAF (e.g. Vercel Firewall, AWS WAF, Cloudflare, Cloud Armor) owns the cross-cutting concerns at the edge: HTTPS only, per-IP rate limits, GET/HEAD only, header and URL size caps, managed OWASP rulesets, bot and DDoS protection, IP or geo allow-lists. The in-process `rate-limiter-flexible` limits (ADR 0004) count per instance, so they stay only as a backstop. |
| Caching                   | None needed                                    | Pages stay dynamic because of the nonce CSP. Static assets are cached immutably. Revisit page caching only together with the CSP design (ADR 0003).                                                                                                                                                                                                                                           |
| Logs                      | stdout in the terminal                         | A log drain (e.g. Datadog, CloudWatch, OpenTelemetry). The JSON lines are already structured. Retention to be set (intent §9).                                                                                                                                                                                                                                                                |
| Observability and metrics | None; JSON log lines only                      | Cloud observability (e.g. Vercel Observability, Datadog, CloudWatch, Grafana via OpenTelemetry): request rate, p50/p95 latency, error rate and DB query time per route; traces across page render and repository calls, started from `instrumentation.ts`; dashboards and SLO-based alerts on latency, errors and data freshness (`dataset_meta.as_of`).                                      |
| Health and alerting       | `curl /api/health`                             | Load-balancer health checks, an uptime monitor on `/api/health`, and an alert on bursts of `request_failed` or `startup_check_failed`                                                                                                                                                                                                                                                         |
| Releases and rollback     | Rebuild locally                                | Immutable deployments tagged with `APP_VERSION`, one-click or instant rollback, an optional canary or rolling release                                                                                                                                                                                                                                                                         |
| Time                      | Server clock injected at the page edge         | The same; all bucketing stays in `Australia/Sydney` whatever the server's timezone                                                                                                                                                                                                                                                                                                            |
| Access                    | Public, sample data only                       | Sign-in with OIDC, plus state and agency roles, **before** any real data (intent §9)                                                                                                                                                                                                                                                                                                          |
