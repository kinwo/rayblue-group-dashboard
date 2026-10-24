# E2E Test Results: Rental Analytics v1

Results of running [e2e-test-plan.md](e2e-test-plan.md) by hand in a real browser against the production build.

Run: 24 Oct 2026, 10:15–10:40 AEDT · Branch `feat/rental-analytics-v1` (base `eeffab7`) · Status: **4 defects fixed, 3 open findings**

## 1. Summary

| Result | Scenarios |
| --- | --- |
| ✅ Pass first time | 62 (61 from the plan, plus AC-AGY-6, which the plan called unreachable) |
| 🔧 Failed → fixed and re-verified | 6 scenarios, from 4 defects (D1–D4) |
| ⚠️ Open finding (needs a decision) | 2 scenarios, from 3 findings (F1–F3) |
| ◐ Partial / ⏭ not run (tooling) | 1 / 1 |
| **Total** | **72** (71 plan scenarios + 1) |

Browser coverage was Chromium only. The Firefox and WebKit projects weren't run (see §4).

Every figure on screen matched an independent oracle: the KPIs, trend buckets, state totals, top-agency counts, shares and "vs previous". This held in every scope checked (group, NSW, VIC, QLD, TAS, WA, and agencies 7, 13, 16, 23, 28, 29) and in all three periods.

### Defects fixed in this run

| # | Scenario | Defect | Fix | Re-test |
| --- | --- | --- | --- | --- |
| D1 | E2E-SEC-01 | `/api/*` responses, 405s and static files (`/_next/static/*`, `/favicon.ico`) had **no Content-Security-Policy**. AC-SEC-4 requires one on every response. | Added a fixed, nonce-free `NON_PAGE_CONTENT_SECURITY_POLICY` in [security-headers.ts](src/utils/security-headers.ts). [proxy.ts](src/proxy.ts) sets it on API and 405 responses that carry no page CSP; [next.config.ts](next.config.ts) sets it on static paths the proxy skips. Pages keep their per-request nonce CSP, and there is still only one CSP header per page. | Pass ([http-checks-after-fix.txt](evidence/e2e/http-checks-after-fix.txt)) |
| D2 | E2E-TRD-01, E2E-CMP-01 | Trend chart x-axis: the latest label was **clipped** ("24 Oc") at 1440px, and at 360px the labels **ran together** ("12 Oct14 Oct16 Oct…"). | [trend-chart.tsx](src/components/analytics/trend-chart.tsx): a 28px right margin, plus `interval="preserveEnd"` and `minTickGap={8}`. Every second label still shows on desktop. Narrow cards drop overlapping labels but always keep the latest (DESIGN.md §7). | Pass (screenshots 24, 25) |
| D3 | E2E-NAV-05 | Mobile sheet: after Escape or choosing "Rental analytics", **focus did not return to the menu button**; it went to `<body>`. | [mobile-nav-button.tsx](src/components/layout/mobile-nav-button.tsx) refocuses itself when the sheet goes from open to closed. Radix can't do it, because the sheet is not opened from its own trigger. `src/components/ui/*` is unchanged. Two RTL assertions were added; they fail without the fix. | Pass (screenshot 26) |
| D4 | E2E-A11Y-01, E2E-STA-03 | With a state or agency selected, **whole rows** of other states faded to 35%, labels and counts included. axe: `color-contrast` (serious) on 16 nodes. AC-STA-3 and DESIGN.md say only the *bars* fade. | [state-bars.tsx](src/components/analytics/state-bars.tsx) moves `opacity-35` from the `<li>` to the bar. Tests now check the bar, plus a new test that rows stay at full opacity. | axe shows 0 violations in every view (screenshot 29) |

Repo gate after the fixes: `npm run lint && npm run typecheck && npm test` passes (33 suites, 277 tests).

### Open findings (not auto-fixed; they need a product or design call)

| # | Scenario | Finding | Why it isn't auto-fixed | Suggested direction |
| --- | --- | --- | --- | --- |
| F1 | E2E-NAV-04 | With an agency selected, the sidebar context line still names the **state** ("Group office · Victoria"), not the agency (screenshot 16). The plan expects the agency's name. | This is deliberate in code: the shell lives in the root layout, which can't see `agencyId` or the database ("the only scope the shell can know", [app-sidebar.tsx](src/components/layout/app-sidebar.tsx)). Showing the agency means a layout-level DB read, or a client update after hydration that briefly flashes the wrong text. | Decide whether AC-NAV-1's "current scope" includes the agency. If it does, read agency names in the layout; if not, amend the plan. |
| F2 | E2E-REL-05 | Page requests produce **no access log line**. Only `/api/*` logs `route/status/durationMs`; page renders log only on failure (`request_failed`). | Next.js's proxy never sees the final status, and a page-level log would have to assume 200. | Decide whether AC-REL-7 needs a line for every page request. If so, a custom server or a platform access log is the clean place for it. |
| F3 | E2E-REL-05, E2E-STE-02 | When a render fails, Next.js also prints its own unstructured `⨯ Error [DataUnavailableError] … at …` **stack trace** to stdout, next to the app's JSON line. `next start` banner lines are also not JSON. Nothing reaches the client (AC-SEC-5 holds). | This is framework output, not app code. | Treat stdout as framework plus app output and filter the JSON lines, or wrap `next start` so non-JSON lines are discarded. |

## 2. Environment and method

| Item | Value |
| --- | --- |
| Server | `npm run build && npm run start` (Next.js 16.4.3, production), Node 24.19.0, `http://localhost:3000` |
| Data | `npm run db:migrate && npm run db:seed`: seed 20261024, as-of 9:00 am Sat 24 Oct 2026 Sydney, 30 agencies (NSW 12, VIC 10, QLD 8), 3,214 listings |
| Browser | `agent-browser` (Chromium over CDP), 1440×900 desktop; 412×915, 360×740, 807 and 809 wide; light, dark and reduced-motion media emulation; `TZ` set per session for time-zone runs |
| HTTP checks | `curl` and Python `urllib` against the same server |
| Expected figures | [oracle.py](evidence/e2e/oracle.py) reads `data/rayblue.db` with plain SQL and buckets in `Australia/Sydney` with `zoneinfo`. It doesn't use the app's services or date helpers. Output: [expected.json](evidence/e2e/expected.json) |
| Accessibility | axe-core 4.14.0, already in `node_modules` as an ESLint dependency, so nothing was installed. Injected into the page with tags `wcag2a, wcag2aa, wcag21a, wcag21aa` |
| Selectors | Roles, labels and visible text, plus computed styles for visual checks |

The plan targets Playwright specs (`e2e/*.spec.ts`), which need an ADR before adding the dependency. This run executes the same scenarios by hand without adding any dependency. The evidence is in [evidence/e2e/](evidence/e2e/), with screenshots in [evidence/e2e/shots/](evidence/e2e/shots/).

## 3. Results by scenario

Legend: ✅ pass · 🔧 failed, fixed, re-verified · ⚠️ open finding · ◐ partial · ⏭ not run

### 3.1 Navigation and app shell

| ID | Result | Evidence and notes |
| --- | --- | --- |
| E2E-NAV-01 | ✅ | `GET /` → 307 to `/rental-analytics` ([http-checks.txt](evidence/e2e/http-checks.txt)) |
| E2E-NAV-02 | ✅ | Sidebar: "Rayblue Agency Group", "Group office · All states and territories", one link "Rental analytics", footer "Group manager view", no user name or sign-out. Shot 01 |
| E2E-NAV-03 | ✅ | `aria-current="page"` on the link ([inspect-defaults.json](evidence/e2e/inspect-defaults.json)) |
| E2E-NAV-04 | ⚠️ F1 | State: "Group office · Victoria" ✅. Agency: still "Group office · Victoria". Shot 16 |
| E2E-NAV-05 `@mobile` | 🔧 D3 | At 412px: sidebar hidden, "Open navigation menu" button shown; the sheet is a `dialog` and closes on Escape and on choosing the item. Focus return fixed. Shots 17–20, 26 |
| E2E-NAV-06 | ✅ | 807px: menu button, no fixed sidebar. 809px: fixed sidebar. Shots 21 |
| E2E-NAV-07 | ✅ | Tab order: sidebar link → state → agency → Daily tab → panel → chart → 5 sort buttons. Each has a 2px solid outline, and the controls also have a ring. Shots 11, 12 |

### 3.2 Filters and URL state

| ID | Result | Evidence and notes |
| --- | --- | --- |
| E2E-FLT-01 | ✅ | Defaults: "All states and territories", "All agencies", Daily `aria-selected` |
| E2E-FLT-02 | ✅ | 9 options in the plan's order. Shot 03 |
| E2E-FLT-03 | ✅ | "All agencies" plus 30 agencies sorted by name, each showing its state |
| E2E-FLT-04 | ✅ | Queensland: 8 QLD agencies, sorted. Shot 04 |
| E2E-FLT-05 | ✅ | Typing "Tow" highlights "Rayblue Townsville City" (first match). Shot 05 |
| E2E-FLT-06 | ✅ | ArrowRight ×2, ArrowLeft: Daily → Weekly → Monthly → Weekly; focus, selection and `granularity` follow. Shot 07 |
| E2E-FLT-07 | ✅ | `?state=QLD&agencyId=29&granularity=weekly|monthly`; headings and figures re-scoped (equal to the oracle). Shot 06 |
| E2E-FLT-08 | ✅ | Reload keeps the view; cookies, `localStorage` and `sessionStorage` are empty |
| E2E-FLT-09 | ✅ | Six Back then six Forward steps: URL, controls, tab, KPIs and chart label match each original view at every step |
| E2E-FLT-10 | ✅ | Same URL in a fresh browser session: identical `main` text hash ([shared-url.txt](evidence/e2e/shared-url.txt)) |
| E2E-FLT-11 | ✅ | All 8 bad inputs → 200, fallback applied, valid params kept, no echo, error text or dialog in the rendered page. Note: Next's RSC router state in an inline script holds the request URL *URL-encoded* (framework data, never rendered) |
| E2E-FLT-12 | ✅ | `?state=VIC&agencyId=2` (NSW agency) → Victoria kept, "All agencies", VIC figures |
| E2E-FLT-13 | ✅ | QLD agency, then Tasmania: agency resets, URL drops `agencyId`. Shot 08 |
| E2E-FLT-14 | ✅ | State, then agency (2 changes) reaches a single-agency view; KPI, trend, highlight and table all reflect it |

### 3.3 KPI tiles

| ID | Result | Evidence and notes |
| --- | --- | --- |
| E2E-KPI-01 | ✅ | Group: 10 / 692 / 2,586, agencies 30, "Across 8 states and territories" (equal to the oracle) |
| E2E-KPI-02 | ✅ | VIC: 6 / 224 / 838, agencies 10, "In Victoria" |
| E2E-KPI-03 | ✅ | Agency 29: 0 / 26 / 95, agencies 1. Agency 16: 0 / 11 / 39 |
| E2E-KPI-04 | ✅ | "To 9:00 am · last Saturday 55", "Week to date · last week 768", "Month to date · September 628" |
| E2E-KPI-05 | ✅ | en-AU grouping, `tabular-nums`, colour = ink token `rgb(14, 34, 50)` |
| E2E-KPI-06 | ✅ | Tile text identical across Daily, Weekly and Monthly |

### 3.4 Trend chart

| ID | Result | Evidence and notes |
| --- | --- | --- |
| E2E-TRD-01 | 🔧 D2 | 14 rows, 11 Oct to 24 Oct, values equal the oracle. Last axis label was clipped; fixed. Shots 01 → 24 |
| E2E-TRD-02 | ✅ | 12 weeks, Monday starts, 3 Aug to 19 Oct |
| E2E-TRD-03 | ✅ | 12 months, November 2025 to October 2026. Shot 09 |
| E2E-TRD-04 | ✅ | Last-point tooltips: "Sat 24 Oct 2026 (to date)", "Week of 19 Oct 2026 (to date)", "October 2026 (to date)"; earlier points have no suffix. Shot 10 |
| E2E-TRD-05 | ✅ | Zero buckets kept as 0 (7 empty weeks, 10 empty months, Tasmania all zeros). Shot 08 |
| E2E-TRD-06 | ✅ | Title per period; series "All Rayblue agencies", "Tasmania" or "Western Australia", "Rayblue Townsville City" |
| E2E-TRD-07 | ✅ | Tab into the chart, then arrows move the tooltip (Mon 12 Oct 124 → Tue 13 Oct 145 → Sun 11 Oct 27). Shot 13 |
| E2E-TRD-08 | ✅ | `role="img"`, label "…11 Oct to 24 Oct. Latest 10, peak 149." matches the table |

### 3.5 By-state bars and top agencies

| ID | Result | Evidence and notes |
| --- | --- | --- |
| E2E-STA-01 | ✅ | 8 rows, descending: NSW 589, VIC 479, QLD 419, others 0 (daily); weekly and monthly 1,270 / 1,040 / 904 |
| E2E-STA-02 | ✅ | Code, "12 agencies" / "0 agencies", bars 100% / 81.3% (206px of 253) / 71.1%, tabular counts |
| E2E-STA-03 | 🔧 D4 | Description names the state; all 8 rows visible. After the fix, other bars are at 0.35 opacity and rows at 1. Shot 29 |
| E2E-STA-04 | ✅ | 589 + 479 + 419 = 1,487 = sum of the 14 trend buckets |
| E2E-AGY-01 | ✅ | Caption "Top agencies by new listings", 8 rows descending; "Share of group" / "Share of QLD" / "Share of TAS" |
| E2E-AGY-02 | ✅ | Shares and "vs previous" equal the oracle; U+2212 for negatives, "0%", "—" when previous is 0 (weekly, monthly) |
| E2E-AGY-03 | ✅ | `?agencyId=13`: Carlton selected, 8 rows |
| E2E-AGY-04 | ✅ | `?agencyId=16`: 9 rows, Footscray ninth and `aria-selected`. Shot 15 |
| E2E-AGY-05 | ✅ | Click and Enter: `aria-sort` cycles ascending ↔ descending, others `none`, URL unchanged. Shot 14 |
| E2E-AGY-06 | ✅ | Numeric cells `text-align: right`, `tabular-nums` |
| E2E-AGY-07 `@layout` | ✅ | 360px: table frame `overflow-x: auto` (276 / 598px), page `scrollWidth` 360. Shot 22 |
| (AC-AGY-6) | ✅ | The plan calls this unreachable with the seed, but `?state=TAS` and `?state=WA` show "No agencies match these filters." Shots 08, 29 |

### 3.6 Header, states, security, privacy, operations

| ID | Result | Evidence and notes |
| --- | --- | --- |
| E2E-HDR-01 | ✅ | One `h1`; meta line correct for All and Tasmania; same text with browser `TZ` Europe/London and America/New_York, and a no-hydration-error tooltip in New York ([timezones.txt](evidence/e2e/timezones.txt), shot 30) |
| E2E-HDR-02 | ✅ | DB copy seeded at 9:00 am 22 Oct: alert "Figures may be out of date · …9:00 am, 22 Oct 2026, more than a day ago". Real dataset: no alert ([stale-warning.txt](evidence/e2e/stale-warning.txt), shot 33). Done by seeding an older as-of time, not by controlling the clock (§10.3) |
| E2E-HDR-03 | ✅ | 5 URLs × 3 requests: identical text hashes |
| E2E-STE-01 | ◐ | The SSR stream includes the loading skeleton ("Loading rental analytics"). Network throttling and the CLS measurement weren't available in the tool |
| E2E-STE-02 | ✅ | DB file removed after start: error view "We can't load the figures right now" with Retry; no stack, path, SQL or env in the HTML. Restoring the file and pressing Retry reloads the figures. Shots 31, 32. The initial response is HTTP 200 because the page streams (the error replaces the skeleton client-side) |
| E2E-STE-03 | ✅ | `/nope`, `/rental-analytics/x` → 404 with a link to Rental analytics. Shots 27, 28 |
| E2E-SEC-01 | 🔧 D1 | All headers present, no `X-Powered-By`. CSP was missing on API and static responses; fixed |
| E2E-SEC-02 | ✅ | No console errors and no CSP violations on 4 page variants ([console-csp.txt](evidence/e2e/console-csp.txt)) |
| E2E-SEC-03 | ✅ | POST, PUT, PATCH, DELETE and Next-Action POST → 405; no `form[method=post]` |
| E2E-PRV-01 | ✅ | 2,241 addresses and manager names, and 164 rent values: 0 hits in 8 HTML and 6 RSC bodies |
| E2E-PRV-02 | ✅ | No `Set-Cookie`; `document.cookie` empty; fonts self-hosted |
| E2E-REL-01 | ✅ | `{"status":"ok","version":"0.1.0","database":"ok"}`, `Cache-Control: no-store` |
| E2E-REL-02 | ✅ | DB unavailable: 503 `{"status":"error","version":"0.1.0","database":"unavailable"}`, `no-store` ([db-unavailable.txt](evidence/e2e/db-unavailable.txt)) |
| E2E-REL-03 | ✅ | DB SHA-1 and mtime unchanged across the whole run ([db-readonly.txt](evidence/e2e/db-readonly.txt)) |
| E2E-REL-04 | ✅ | Invalid `LOG_LEVEL`, invalid `APP_VERSION`, missing DB, empty DB, no migrations, wrong migration: each exits 1 within 0.3s with one JSON line. Every variable has a default, so "missing env var" can't fail ([startup-failures.txt](evidence/e2e/startup-failures.txt)) |
| E2E-REL-05 | ⚠️ F2, F3 | App lines are valid JSON with the required fields, with no cookies, addresses or rents. Pages aren't access-logged, and Next prints non-JSON banner and stack lines ([logs-check.txt](evidence/e2e/logs-check.txt)) |

### 3.7 Accessibility, theme and layout

| ID | Result | Evidence and notes |
| --- | --- | --- |
| E2E-A11Y-01 | 🔧 D4 | After the fix: 0 violations on defaults, VIC, agency 13, WA, agency 28 monthly, weekly, monthly, the open mobile sheet, and the 404 page, in light and dark ([axe-results.txt](evidence/e2e/axe-results.txt)) |
| E2E-A11Y-02 | ✅ | `lang="en-AU"`, 1 `nav`, 1 `main`, labelled regions, 1 `h1` |
| E2E-A11Y-03 | ✅ | State, agency (type-ahead + Enter), period (arrows), sort (Enter) and chart tooltip (arrows) all work by keyboard; focus always visible; Tab cycles back to the top with no trap |
| E2E-A11Y-04 | ✅ | `reduce`: 0 elements with non-zero transitions or animations, including while the sheet opens. Control without `reduce`: 23 |
| E2E-THM-01 | ✅ | Dark body `#0a141c`, sidebar `#060f16`; light body `#f4f7fa`, sidebar `#0c2638` (DESIGN.md tokens). Shot 23 |
| E2E-CMP-01 | 🔧 D2 | `scrollWidth == innerWidth` at 360, 412, 768, 1024 and 1440, on defaults and with the longest agency name. Chart labels at 360 fixed. Shots 22, 25 |

### 3.8 Performance

| ID | Result | Evidence and notes |
| --- | --- | --- |
| E2E-PRF-01 | ✅ | 200 sequential mixed GETs: p50 8.8ms, **p95 11.7ms**, max 19.2ms (target ≤ 500ms) ([perf.txt](evidence/e2e/perf.txt)) |
| E2E-PRF-02 | ⏭ | Lighthouse isn't installed. Not run, so no new dependency was added |
| E2E-PRF-03 | ✅ | Period tab change → chart updated: 10 runs at 344–358ms, CLI round trip included (target ≤ 1s) |

## 4. Not covered, and notes for the Playwright suite

- **Not run:** Firefox and WebKit projects (only Chromium was available to the tool), CLS under throttling (E2E-STE-01), Lighthouse (E2E-PRF-02), and visual snapshot baselines (E2E-THM-01).
- **Plan corrections:**
  - §7 says AC-AGY-6 can't be reached with the seed. It can (`?state=TAS`), because only NSW, VIC and QLD have agencies (intent.md › Prototype seed scope).
  - E2E-REL-04's "missing env var" case can't fail, because every variable has a default.
- **Harness gotchas** (useful when writing the specs):
  - A hidden or backgrounded tab stops Recharts' `ResponsiveContainer` measuring, so the chart renders empty. Make sure the page is visible.
  - `next start` renames its process to `next-server`, so kill by PID or port, not by command pattern.
  - Drizzle's `__drizzle_migrations.id` is NULL in SQLite. Tamper with migrations by `hash`, not `id`.
- **Screenshot 25** (360px axis fix) was taken before the D4 fix, which is why NSW and VIC text looks faded there. Shot 29 shows the final state.
