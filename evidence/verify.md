# Verify

What was checked on `feat/rental-analytics-v1` ([PR #1](https://github.com/kinwo/rayblue-group-dashboard/pull/1)), the results, what is still unverified, and where each check runs. Acceptance criteria IDs refer to [intent.md](../intent.md).

Status as of 24 Oct 2026, head `eeffab7`.

## 1. Checks run and results

| Check | Command | Result |
| --- | --- | --- |
| Lint, including the layering rules (AC-MNT-1) | `npm run lint` | ✅ 0 errors, 0 warnings |
| Type check (strict) | `npm run typecheck` | ✅ 0 errors |
| Unit, property, component and data tests | `npm test` | ✅ **275 tests in 33 suites, all passing** |
| Coverage (AC-MNT-3) | `npm test -- --coverage` | ✅ `src/utils` 100% lines; `src/services` 100% lines on every file with code (the summary shows 71.8% only because the type-only `rental-analytics.types.ts` counts as 0); overall 89.9% lines, 98.6% branches |
| Migrate and seed | `npm run db:migrate && npm run db:seed` | ✅ 30 agencies (NSW 12, VIC 10, QLD 8), 3,214 listings; identical counts on a second run (AC-DAT-2) |
| Production build | `npm run build` | ✅ Every route dynamic (ƒ), with no Suspense or cacheComponents errors |
| Dependency audit (AC-SEC-7) | `npm audit --omit=dev --audit-level=high` | ✅ No high or critical vulnerabilities (CI) |
| Secret scan (AC-SEC-6) | GitGuardian on the PR | ✅ Pass |
| CI pipeline (AC-REL-1) | GitHub Actions `verify` job on PR #1 | ✅ Pass, 2 min 30 s: checkout → `npm ci` → lint → typecheck → tests with coverage → migrate and seed → build → audit |

**Results by area:**

| Area | Tests | What they assert |
| --- | --- | --- |
| `src/utils` | 96 | **Sydney date bucketing** (property tests, AC-DAT-1, AC-TRD-1/3): conservation, exclusivity, continuity across the DST changes (4 Oct, 5 Apr) and month/year ends, daily summed per week = weekly, zero-filled buckets, partial last bucket. **Formatting:** en-AU grouping, U+2212 minus, "—", "(to date)", "9:00 am". **Search params** (AC-FLT-8, AC-SEC-2): arbitrary strings never throw, each param falls back on its own, length caps. **Also:** `cn` type scale, chart colours, the logger's no-stack and allow-listed fields, states. |
| `src/services` | 32 | Against real in-memory SQLite. **KPI and trend counts** across a DST change and the September month end (AC-KPI-3). **Agency outside the state** is dropped (AC-FLT-9). **Stale flag** (AC-HDR-2). **Empty scope** gives zeros (AC-STE-2). **Properties:** filter monotonicity, state totals = group total (AC-STA-4), shares sum to 100% (AC-AGY-2), top 8 plus the selected 9th (AC-AGY-4). **Failures:** `DataUnavailableError` and `DataIntegrityError` propagate. **Bounded:** one read only (AC-SEC-2). **Health** ok and unavailable. |
| `src/data`, `src/clients` | 42 | Repository filters and the half-open range. Results carry no address, rent or property-manager field (AC-PRV-1). A missing, closed or corrupt DB gives `DataUnavailableError`. Read-only open. Migrations apply. Seed determinism, the NSW/VIC/QLD-only scope and no listing after the as-of time (AC-DAT-2/3). Start-up checks for a missing DB, a migration mismatch and invalid env (AC-REL-5). |
| Platform (`proxy.ts`, `instrumentation.ts`, `/api`) | 23 | Non-GET returns 405 with `Allow: GET, HEAD` (AC-SEC-1). The CSP directives and the nonce. The security headers (AC-SEC-4). No cookies. Health returns 200 or 503 with `no-store` (AC-REL-4). Unknown `/api/*` returns a JSON 404. Only `GET` is exported. `onRequestError` logs one structured line. |
| `src/components` | 68 | By role and label (React Testing Library): sidebar `aria-current`, the mobile sheet and Escape (AC-NAV-1..6). **Filters:** options, URL-only state, agency reset on a state change, arrow-key tabs (AC-FLT-1..5, 10). **KPI notes** (AC-KPI-2/4/5). **Chart:** `role="img"` label, the sr-only table, "(to date)" (AC-TRD-2/4/6). **State bars:** the 35% fade (AC-STA-2/3). **Table:** caption, `aria-sort`, `aria-selected`, empty state (AC-AGY-4..7). **Header and stale alert.** **Nonce provider.** |
| `src/app` | 14 | `/` redirects (AC-NAV-3). The page renders with default and malformed params on the real service and in-memory DB. The error view never shows the message, digest, SQL or path (AC-STE-3). Not-found links back (AC-STE-4). `lang="en-AU"` (AC-A11Y-3). |

**Verified against a real production server** during development (`next start` and `curl`, by teammates Sam and Albert):
- `/api/health` returns 200, then 503 with `database: "unavailable"` once the DB file is moved away, then 200 again once it is restored, without a restart.
- `/api/nope` returns a JSON 404, and `POST /api/health` returns 405.
- Pages carry the nonce CSP, HSTS, `nosniff`, Referrer-Policy and Permissions-Policy, and no `X-Powered-By`.
- Starting with a missing DB or `LOG_LEVEL=loud` prints one `startup_check_failed` JSON line and exits with code 1.
- After the dynamic-rendering fix, one browser pass found every `<script>` and `<style>` carrying the response nonce, and filters, tabs, type-ahead, tooltip and the mobile sheet all working.

## 2. Known gaps

| Gap | Why | Covered by |
| --- | --- | --- |
| **Production build in a browser after the final commits.** This includes CSP console violations after the last Select and Sheet nonce fix (`2a0f2c7`, `b1ee51a`). | Out of scope for the agent; the user is checking it | The user's manual check |
| **Automated integration and E2E tests**: HTTP-level ACs such as AC-FLT-7 and AC-HDR-3 (identical figures per URL), AC-PRV-2 (no addresses in responses), AC-STE-4 (404 status) and AC-SEC-4/5 over HTTP | The lead's integration suite was dropped as out of scope before it ran | [e2e-test-plan.md](../e2e-test-plan.md), run in a separate session (`e2e-test-results.md`) |
| Back/Forward restores each view (AC-FLT-6) | Manual by definition | The E2E plan and the user's check |
| Accessibility: Lighthouse 100 and zero axe violations (AC-A11Y-1), keyboard focus ring checked by eye (AC-NAV-5), reduced motion (AC-A11Y-4) | Not run | Manual and E2E. Known risk: axe may flag Recharts' focusable `accessibilityLayer` inside the `role="img"` wrapper. |
| Performance: p95 ≤ 500 ms, Lighthouse ≥ 90, update ≤ 1 s (AC-PRF-1..3) | Not measured | Manual, on the release build |
| Cross-browser and 360px layout (AC-CMP-1/2) | Only Chromium (the in-app browser) was used during development | Manual and the E2E browser matrix |
| Dark theme by eye (AC-THM-1) | Tokens are unit-tested; visual check not done | Manual |
| Branch protection on `main` (AC-REL-1) | A repository setting; not configured by the agent | The repo admin |
| Rollback rehearsal (AC-REL-6) | No deployment target chosen yet | [docs/runbook.md](../docs/runbook.md), once a host exists |
| Lockfile drift: `package-lock.json` shows 132 uncommitted deleted lines in the working tree | Appeared after the PR was opened; not made by this session | Review before committing; CI's `npm ci` uses the committed lockfile |
| Seed scope: Weekly and Monthly trends and "vs previous" are mostly 0 or "—" | The 30-day seed is intentional (ADR 0002) | Not a defect; a 24-month seed would exercise them |

## 3. Where each check runs

| Check | Local, developer | Pull request (GitHub Actions) | Release pipeline |
| --- | --- | --- | --- |
| `npm run lint` (layering rules included) | ✅ before every commit (required by the team brief) | ✅ | ✅ |
| `npm run typecheck` | ✅ | ✅ | ✅ |
| `npm test`: unit, fast-check properties, RTL components, in-memory SQLite | ✅ (`npm run test:watch` while coding) | ✅ with `--coverage` | ✅ |
| `npm run db:migrate && npm run db:seed` | ✅ to run the app | ✅ (the build needs the DB) | ✅ the DB ships inside the release artifact (AC-REL-3) |
| `npm run build` | Optional; needed to see CSP and hydration issues | ✅ | ✅ produces the immutable, versioned release |
| `npm audit --omit=dev --audit-level=high` | Optional | ✅ fails the PR on high or critical | ✅ |
| Secret scanning | — | ✅ GitGuardian | ✅ |
| Production smoke: `npm start`, then `curl /api/health`, headers and outage drill | ✅ manual (commands in [operate.md](operate.md)) | Proposed, once integration tests are back in scope | ✅ post-deploy health check (runbook) |
| E2E (Playwright, per [e2e-test-plan.md](../e2e-test-plan.md)) | ✅ against `npm start` | Planned: Chromium, Firefox and WebKit on every PR | Before each release |
| Lighthouse, axe, performance timings | ✅ manual | Could be added as an E2E project (`@axe-core/playwright`, needs an ADR) | Recorded with each release (intent §8) |
| Branch protection and required review | — | Repository setting | — |

**Definition of done** used throughout (AGENTS.md): `npm run lint && npm run typecheck && npm test` passes locally and in CI.
