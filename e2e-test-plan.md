# E2E Test Plan: Rental Analytics v1

End-to-end test plan for the acceptance criteria in [intent.md](evidence/intent.md). Unit, property and component tests are covered by [ENGINEERING.md › Testing strategy](ENGINEERING.md#5-testing-strategy); this plan covers what only a real browser against a real server can prove: routing, URL state, HTTP behaviour, response headers, cross-browser layout, keyboard flows and that the figures on screen match the seeded database.

Status: draft · Last updated 24 Oct 2026

## 1. Scope

**In scope:** every AC whose method is `integration` or `manual`, plus `component` ACs where a full-page journey adds confidence (filters, navigation, responsive sidebar, tooltips). Each scenario below lists the ACs it covers.

**Out of scope:** ACs verified only by `unit`, `property` or `CI` (listed in [§9](#9-acs-not-covered-by-e2e)). E2E does not repeat the property tests; it checks that their results reach the page.

## 2. Approach

| Topic | Decision |
| --- | --- |
| Runner | Playwright Test (`@playwright/test`), with `@axe-core/playwright` for accessibility checks. Not yet a dependency: adding it needs an ADR in `docs/adr/` (AGENTS.md rule 8). |
| Location | `e2e/` at the repo root (`*.spec.ts`), outside `src/` so it is not part of the Jest run. Script: `npm run test:e2e`. |
| Target | The **production build** (`npm run build && npm run start`), never `next dev`, so headers, error pages and performance match a release. |
| Data | The database built by `npm run db:migrate && npm run db:seed` with the fixed seed value, the same one shipped with the release (AC-REL-3). |
| As-of time | Taken from the seeded dataset. Example figures in this plan assume the intent.md example: **9:00 am, Sat 24 Oct 2026** (Sydney). |
| Clock | Browser clock fixed with `page.clock` to just after the as-of time. Server clock is controlled only where a scenario says so (see [§10](#10-prerequisites-and-open-questions)). |
| Selectors | By role, label and visible text (`getByRole`, `getByLabel`), matching the RTL rule. No CSS classes or test ids. |
| Expected figures | A global setup step reads the built SQLite file with independent SQL (not the app's services) and writes `e2e/.expected.json` with counts per scope and period. Specs compare the page against it. No hard-coded counts. |
| Isolation | Every test starts from a fresh page and a URL; there is no shared client state to reset because the app is read-only. |

### Browser and viewport matrix

| Project | Engine | Viewport | Runs |
| --- | --- | --- | --- |
| `desktop-chromium` | Chromium | 1440×900 | Every PR, all specs |
| `desktop-firefox` | Firefox | 1440×900 | Every PR, all specs |
| `desktop-webkit` | WebKit | 1440×900 | Every PR, all specs |
| `mobile-chromium` | Chromium (Pixel 7) | 412×915 | Every PR, `@mobile` specs |
| `mobile-webkit` | WebKit (iPhone 15) | 393×852 | Every PR, `@mobile` specs |
| `narrow` | Chromium | 360×740 | Every PR, `@layout` specs |
| `dark` | Chromium, `colorScheme: 'dark'` | 1440×900 | Every PR, `@theme` specs |

Edge is Chromium-based; the latest-two-versions check on real Chrome, Edge, Firefox and Safari (AC-CMP-1) stays a manual release step.

## 3. Navigation and app shell

| ID | Scenario | Steps | Expected | ACs |
| --- | --- | --- | --- | --- |
| E2E-NAV-01 | Root redirects | Request `/`. | Final URL is `/rental-analytics`; redirect status is 307/308. | AC-NAV-3 |
| E2E-NAV-02 | Sidebar content | Open `/rental-analytics`. | `navigation` landmark contains "Rayblue Agency Group", the scope context line, exactly one link "Rental analytics", and footer "Group manager view". No text naming a signed-in user, no sign-out control. | AC-NAV-1, AC-NAV-6 |
| E2E-NAV-03 | Current item | Same page. | "Rental analytics" link has `aria-current="page"`. | AC-NAV-2 |
| E2E-NAV-04 | Context line follows scope | Open `?state=VIC`, then `?state=VIC&agencyId=<vic agency>`. | Context line names Victoria, then the agency. | AC-NAV-1 |
| E2E-NAV-05 `@mobile` | Sidebar as sheet | At < 808px, load the page. Open the menu button, press Escape. Reopen, choose "Rental analytics". | Sidebar hidden initially; a button with an accessible name (e.g. "Open menu") is visible. Sheet opens as a `dialog`, closes on Escape, and closes after choosing the item. Focus returns to the menu button. | AC-NAV-4 |
| E2E-NAV-06 | Breakpoint edge | Load at 807px and 809px. | Sheet mode at 807px, fixed sidebar at 809px. | AC-NAV-4 |
| E2E-NAV-07 | Keyboard reach | From page load, press Tab through the sidebar. | Every sidebar control receives focus in visual order; each focused element has a visible focus outline (non-zero `outline` or `box-shadow` ring, checked by computed style and screenshot). | AC-NAV-5, AC-A11Y-2 |

## 4. Filters and URL state

| ID | Scenario | Steps | Expected | ACs |
| --- | --- | --- | --- | --- |
| E2E-FLT-01 | Defaults | Open `/rental-analytics` with no params. | State select shows "All states and territories", agency shows "All agencies", "Daily" tab selected (`aria-selected="true"`). | AC-FLT-1 |
| E2E-FLT-02 | State options | Open the "State or territory" select. | Options in order: "All states and territories", New South Wales, Victoria, Queensland, Western Australia, South Australia, Tasmania, Australian Capital Territory, Northern Territory. | AC-FLT-2 |
| E2E-FLT-03 | Agency options, all states | Open the "Agency" select with no state. | First option "All agencies"; the rest equal every seeded agency, sorted by name, each showing its state. | AC-FLT-3 |
| E2E-FLT-04 | Agency options narrowed | Choose Queensland, open the agency select. | Only Queensland agencies, sorted by name. | AC-FLT-3 |
| E2E-FLT-05 | Type-ahead | Focus the agency select, type the first letters of a known agency. | Highlighted option jumps to the first match. | AC-FLT-3 |
| E2E-FLT-06 | Period tabs keyboard | Focus "Daily", press ArrowRight twice, then ArrowLeft. | Tabs have `role="tab"` in a `tablist`; focus and selection move Daily → Weekly → Monthly → Weekly; URL `granularity` follows. | AC-FLT-4 |
| E2E-FLT-07 | Filter writes URL | Choose NSW, then an NSW agency, then Monthly. | URL is `?state=NSW&agencyId=<id>&granularity=monthly` (order-insensitive). Page headings and figures match the new scope. | AC-FLT-5 |
| E2E-FLT-08 | URL is the only state | After E2E-FLT-07, reload. | Same filters and figures. `localStorage`, `sessionStorage` and cookies hold no selection. | AC-FLT-5, AC-PRV-5 |
| E2E-FLT-09 | Back and Forward | Apply four changes (state, agency, period, state). Press Back four times, then Forward four times. | At each step the URL, every control and every figure equal the snapshot captured when that view was first shown. | AC-FLT-6 |
| E2E-FLT-10 | Shared URL | In context A, build a view and copy the URL. Open it in a new browser context B. | Filters and every figure (KPI, chart table, state bars, agency table) are identical. | AC-FLT-7, AC-HDR-3 |
| E2E-FLT-11 | Invalid params | Request each: `state=XYZ`, `granularity=hourly`, `agencyId=abc`, `agencyId=-1`, `state=<10,000 chars>`, `state=<script>alert(1)</script>`, repeated params (`state=NSW&state=VIC`). | HTTP 200. The bad param falls back to its default; valid params are kept. Page body does not contain the raw input, "error", "invalid" or a stack trace. No dialog fires. | AC-FLT-8, AC-SEC-2 |
| E2E-FLT-12 | Agency not in state | Open `?state=VIC&agencyId=<NSW agency>`. | State Victoria kept, agency "All agencies", figures for Victoria. | AC-FLT-9 |
| E2E-FLT-13 | State change resets agency | Select an NSW agency, then change state to Tasmania. | Agency resets to "All agencies"; URL has no `agencyId`. | AC-FLT-10 |
| E2E-FLT-14 | Two-change success path | From defaults, in at most two filter changes, reach a single agency's view. | KPI, trend, state highlight and agency table all reflect that agency. | Intent §1 |

## 5. KPI tiles

| ID | Scenario | Steps | Expected | ACs |
| --- | --- | --- | --- | --- |
| E2E-KPI-01 | Group values | Open defaults. | "Listing totals" section has four tiles. Today, this week and this month values equal `.expected.json` for the group. Agencies tile equals seeded agency count, note "Across 8 states and territories". | AC-KPI-1, AC-KPI-3 |
| E2E-KPI-02 | State scope | Open `?state=VIC`. | Listing tiles equal Victoria's expected counts; Agencies tile equals Victoria's agency count, note "In Victoria". | AC-KPI-1 |
| E2E-KPI-03 | Agency scope | Open `?agencyId=<id>`. | Listing tiles equal that agency's counts; Agencies tile shows 1. | AC-KPI-1 |
| E2E-KPI-04 | Comparisons | Defaults. | Notes read "To 9:00 am · last Saturday <n>", "Week to date · last week <n>", "Month to date · September <n>", each `<n>` equal to expected. | AC-KPI-2, AC-KPI-3 |
| E2E-KPI-05 | Formatting | All tiles, every scope above. | Values use `en-AU` grouping (`/^\d{1,3}(,\d{3})*$/`), computed `font-variant-numeric` includes `tabular-nums`, value colour equals the neutral text token (no success/danger colour). | AC-KPI-4 |
| E2E-KPI-06 | Tabs don't move KPIs | Capture tile text, switch to Weekly and Monthly. | Tile text unchanged. | AC-KPI-5 |

DST and month-end correctness (AC-KPI-3) is proven by property and integration tests over generated data. E2E adds one check only if the seeded as-of time can be set to a DST boundary; see [§10](#10-prerequisites-and-open-questions).

## 6. Trend chart

| ID | Scenario | Steps | Expected | ACs |
| --- | --- | --- | --- | --- |
| E2E-TRD-01 | Daily range | Defaults. | Accessible data table has 14 rows, first "11 Oct", last "24 Oct"; values equal expected. | AC-TRD-1 |
| E2E-TRD-02 | Weekly range | `?granularity=weekly`. | 12 rows, Monday start dates, last "19 Oct". | AC-TRD-1 |
| E2E-TRD-03 | Monthly range | `?granularity=monthly`. | 12 rows, "Nov" … "Oct". | AC-TRD-1 |
| E2E-TRD-04 | Partial last bucket | Hover the last point in each period. | Tooltip labels end "(to date)": "Sat 24 Oct 2026 (to date)", "Week of 19 Oct 2026 (to date)", "October 2026 (to date)". Earlier points have no suffix. | AC-TRD-2, AC-TRD-5 |
| E2E-TRD-05 | Zero buckets | Pick a scope with known empty buckets from `.expected.json` (or an agency with sparse data). | Row count still matches the range; empty buckets show 0. | AC-TRD-3, AC-STE-2 |
| E2E-TRD-06 | Titles and series | Defaults, `?state=QLD`, `?agencyId=<id>` across all three periods. | Title "New listings per day / week / month"; description states range and scope; series named "All Rayblue agencies", "Queensland", or the agency name. | AC-TRD-4 |
| E2E-TRD-07 | Keyboard tooltip | Tab into the chart, move between points with arrow keys. | Tooltip shows long date and tabular value for the focused point. | AC-TRD-5 |
| E2E-TRD-08 | Screen-reader label | Defaults. | Chart has `role="img"` and `aria-label` like "New listings per day for All states and territories, 11 Oct to 24 Oct. Latest <n>, peak <n>.", with latest and peak equal to the table's last and max values. | AC-TRD-6 |

## 7. By-state bars and top agencies

| ID | Scenario | Steps | Expected | ACs |
| --- | --- | --- | --- | --- |
| E2E-STA-01 | All states, sorted | Each period. | "New listings by state" shows 8 rows sorted by count descending; counts equal expected group totals per state over the trend range. | AC-STA-1 |
| E2E-STA-02 | Row content | Defaults. | Each row: state code, agency count with correct plural ("1 agency" / "58 agencies"), bar, tabular count. Largest bar has 100% width; others proportional (±1px). | AC-STA-2 |
| E2E-STA-03 | Highlight | `?state=WA`, then `?agencyId=<WA agency>`. | All 8 rows visible; non-WA bars have computed opacity 0.35; description names Western Australia. | AC-STA-3 |
| E2E-STA-04 | Sum check | Defaults. | Sum of the 8 counts equals the sum of the trend table. | AC-STA-4 |
| E2E-AGY-01 | Top 8 | Each period, defaults and `?state=NSW`. | Table has caption "Top agencies by new listings", 8 rows in descending count, scoped to state when set. Header reads "Share of group" or "Share of NSW". | AC-AGY-1, AC-AGY-7 |
| E2E-AGY-02 | Share and change | Defaults. | Share cells match `/^\d+\.\d%$/` and equal expected; "vs previous" matches `/^(\+\d+%\|−\d+%\|0%\|—)$/` with U+2212 for negatives, equal to expected. | AC-AGY-2, AC-AGY-3 |
| E2E-AGY-03 | Selected row in top 8 | `?agencyId=<top agency>`. | Its row has `aria-selected="true"`; still 8 rows. | AC-AGY-4 |
| E2E-AGY-04 | Selected row outside top 8 | `?agencyId=<low-volume agency>`. | 9 rows; the ninth is that agency with `aria-selected="true"`. | AC-AGY-4 |
| E2E-AGY-05 | Sorting | Activate each sortable header button with click and with Enter. | Rows reorder; the header's `aria-sort` cycles `ascending` / `descending`; others are `none`. URL is not required to change. | AC-AGY-5 |
| E2E-AGY-06 | Alignment | Defaults. | Numeric cells computed `text-align: right` and `tabular-nums`. | AC-AGY-7 |
| E2E-AGY-07 `@layout` | Table scroll | At 360px. | Table frame scrolls horizontally; `document.scrollingElement.scrollWidth <= innerWidth`. | AC-CMP-2 |

AC-AGY-6 (no agencies in scope) cannot be reached with the seed, since every state has agencies (AC-DAT-3). It stays a component test.

## 8. Header, states, security, privacy and operations

| ID | Scenario | Steps | Expected | ACs |
| --- | --- | --- | --- | --- |
| E2E-HDR-01 | Header | Defaults and `?state=TAS`. | One `h1` "Rental analytics"; meta line "All states and territories · Sample data · Updated 9:00 am, 24 Oct 2026" (Tasmania in the scoped case). Same text when the browser timezone is `Europe/London` and `America/New_York`. | AC-HDR-1, AC-PRV-4 |
| E2E-HDR-02 | Stale warning | Server clock > 24 h past as-of (see §10). | `alert` says when data was last updated and that figures may be out of date. Not shown when server clock is within 24 h. | AC-HDR-2 |
| E2E-HDR-03 | Determinism | Request 5 random filter URLs 3 times each with `request.get`. | Extracted figures identical across requests. | AC-HDR-3 |
| E2E-STE-01 | Loading skeletons | Throttle network (CDP, Chromium) and navigate between filters. | Each card shows a skeleton; cumulative layout shift during load < 0.1. | AC-STE-1 |
| E2E-STE-02 | Server error | Start a server instance with the error trigger described in §10; load the page. | Error view with plain message and "Retry" button; HTML has no stack trace, absolute path (`/Users/`, `/home/`, `node_modules`), SQL keywords or env names. Retry re-requests the page. | AC-STE-3, AC-SEC-5 |
| E2E-STE-03 | Not found | Request `/nope` and `/rental-analytics/x`. | HTTP 404, not-found page with a link to Rental analytics that navigates there. | AC-STE-4 |
| E2E-SEC-01 | Security headers | `request.get` on `/rental-analytics`, `/nope`, `/api/health`, a static asset. | CSP with self-only `script-src`, `style-src`, `font-src`, `img-src`, plus `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`; `Strict-Transport-Security`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` disabling camera, microphone, geolocation; no `X-Powered-By`. | AC-SEC-4 |
| E2E-SEC-02 | No CSP violations | Browse every scenario page. | No `securitypolicyviolation` events, no console errors. | AC-SEC-4 |
| E2E-SEC-03 | No write paths | Send `POST`, `PUT`, `PATCH`, `DELETE` to `/rental-analytics` and `/api/health`, and a `POST` with a `Next-Action` header. | 405 or 404; never 2xx; no server action executes. The page has no `form` with `method="post"`. | AC-SEC-1 |
| E2E-PRV-01 | No addresses or rents | Global setup extracts every seeded address and weekly rent. Fetch every page variant from this plan plus `/api/health`, including RSC payloads (`RSC: 1` header). | None of the values appear in any response body. | AC-PRV-1, AC-PRV-2 |
| E2E-PRV-02 | No cookies or third parties | Record all requests during the full suite. | Every request goes to the app's origin; no `Set-Cookie` headers; fonts served from the origin; `document.cookie` is empty. | AC-PRV-5 |
| E2E-REL-01 | Health OK | `GET /api/health`. | 200, body exactly `{ status: "ok", version: <package version>, database: "ok" }`, `Cache-Control: no-store`. | AC-REL-4 |
| E2E-REL-02 | Health DB down | Server instance whose DB file becomes unreadable after start (see §10). | 503, `database: "unavailable"`, no other fields. | AC-REL-4 |
| E2E-REL-03 | Read-only DB | Hash the DB file, run the full suite, hash again. | Hashes equal; file mtime unchanged. | AC-SEC-3, AC-REL-3 |
| E2E-REL-04 | Start-up failures | Start the server (outside Playwright, via a Node script) with: a missing env var, an invalid env var, no DB file, a DB on an older migration. | Each exits non-zero within 10 s with exactly one clear log line. | AC-REL-5 |
| E2E-REL-05 | Structured logs | Capture server stdout during the suite. | Each line parses as JSON with `time`, `level`, `route`, `status`, `duration`; none contains cookies, request bodies, addresses or rents. | AC-REL-7 |

### Accessibility, theme and layout

| ID | Scenario | Steps | Expected | ACs |
| --- | --- | --- | --- | --- |
| E2E-A11Y-01 | axe scan | Run axe (WCAG 2.1 A/AA tags) on defaults, a state view, an agency view, each period, the open mobile sheet, the 404 page, light and dark. | Zero violations. | AC-A11Y-1 |
| E2E-A11Y-02 | Document structure | Defaults. | `<html lang="en-AU">`; one `nav`, one `main`, sections labelled; exactly one `h1`. | AC-A11Y-3 |
| E2E-A11Y-03 | Full keyboard journey | Using only the keyboard: change state, agency and period, sort the table, read a chart tooltip. | All reachable and operable; focus always visible; no focus trap outside the open sheet. | AC-A11Y-2, AC-NAV-5 |
| E2E-A11Y-04 | Reduced motion | `reducedMotion: 'reduce'`; open the sheet and change filters. | Computed `transition-duration` and `animation-duration` are 0s (or ≤ 0.01ms) on animated elements. | AC-A11Y-4 |
| E2E-THM-01 `@theme` | Dark and light | `colorScheme` dark, then light. | `body` background equals the dark / light token from DESIGN.md; sidebar background is dark in both. Visual snapshot per theme. | AC-THM-1 |
| E2E-CMP-01 `@layout` | No horizontal scroll | Widths 360, 412, 768, 1024, 1440 on defaults and the widest agency name. | `scrollWidth <= innerWidth` at each width. | AC-CMP-2 |

### Performance (recorded, not gating on PRs)

| ID | Scenario | Expected | ACs |
| --- | --- | --- | --- |
| E2E-PRF-01 | 200 sequential `GET /rental-analytics` with mixed params against the production build. | p95 ≤ 500 ms. | AC-PRF-1 |
| E2E-PRF-02 | Lighthouse desktop (via `playwright-lighthouse` or the Lighthouse CLI) on defaults. | Performance ≥ 90, Accessibility 100. | AC-PRF-2, AC-A11Y-1 |
| E2E-PRF-03 | Time from filter change to updated KPI and chart text, 20 runs per control. | Every run ≤ 1 s. | AC-PRF-3 |

Results go into the release notes, as required by the definition of done.

## 9. ACs not covered by E2E

| AC | Covered by | Reason |
| --- | --- | --- |
| AC-TRD-3 (exhaustive), AC-STA-4 (exhaustive), AC-AGY-2 (sum to 100%), AC-DAT-1 | Property tests | Need generated data, not one seed. E2E spot-checks only. |
| AC-AGY-3 (edge rounding, previous = 0) | Unit | Seed may not contain every edge case. |
| AC-AGY-6 | Component | Unreachable with seeded data. |
| AC-FLT-9 logic, AC-SEC-2 parsing | Unit | E2E covers the observable outcome only (E2E-FLT-11, E2E-FLT-12). |
| AC-DAT-2, AC-DAT-3, AC-PRV-3 | Integration / unit on the seed script | No browser needed. |
| AC-SEC-6, AC-SEC-7, AC-PRV-1 (types), AC-REL-1, AC-REL-2, AC-MNT-1–3 | CI | Repository and pipeline checks. |
| AC-REL-6 | Manual | Runbook review and rollback rehearsal. |
| AC-CMP-1 (real browser versions) | Manual | Playwright bundles its own engines. |
| AC-SEC-1, AC-SEC-3 (code review part) | Manual | E2E covers the runtime behaviour only. |

## 10. Prerequisites and open questions

1. **ADR for Playwright.** Record the choice of `@playwright/test` and `@axe-core/playwright` as dev dependencies.
2. **Expected-figures oracle.** Agree the SQL in the global setup is the independent source of truth, written separately from `src/data` repositories so it does not share bugs.
3. **Server clock control (AC-HDR-2).** The app needs a supported way to set the server's "now" for a test build, e.g. a validated `NOW_OVERRIDE` env var accepted only when `NODE_ENV !== 'production'` or a separate test start script. Without it, E2E-HDR-02 stays a component test. Note: if the seeded as-of time is fixed and the server reads the real clock, every real deployment will show the stale warning a day after build; confirm intended behaviour.
4. **Error trigger (AC-STE-3, AC-REL-4 503).** Start-up checks (AC-REL-5) stop a missing DB from reaching the page. Options: replace the DB with an unreadable file after start-up, or a test-only fault flag. Pick one that never ships in a release build.
5. **DST and month-end via seed.** Decide whether to build extra seed variants with as-of times at a DST change (e.g. 4 Oct 2026, 5 Apr 2026) and on the 1st of a month for an E2E smoke of AC-KPI-3, or leave these to property tests.
6. **HSTS over HTTP.** `Strict-Transport-Security` is ignored by browsers over plain HTTP; E2E asserts the header is sent, not that it is enforced.

## 11. Running and exit criteria

```bash
npm run build
npm run test:e2e
```

- **Every PR:** desktop projects (Chromium, Firefox, WebKit), `@mobile`, `@layout` and `@theme` specs, axe scans, security and privacy checks. Retries: 0 locally, 1 in CI; a test that passes only on retry is treated as flaky and fixed or quarantined with an issue.
- **Release:** full matrix plus performance scenarios and the manual checks in §9.
- **Exit:** all PR-gating scenarios pass on all projects; no axe violations; performance results recorded; every AC in intent.md maps to at least one passing test (E2E here, or the method listed in §9).
