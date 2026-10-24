# Error handling

How each failure reaches the visitor. Three rules hold throughout: the page never shows an error's message, stack, digest, SQL, path or environment value (AC-STE-3); every log line is one safe JSON object (AC-REL-7); and figures that might be wrong are withheld, not shown (AC-STE-7).

## Failure paths

| Failure | Where it is caught | What the visitor sees | HTTP | Log |
| --- | --- | --- | --- | --- |
| Malformed or unknown filter param | `parseAnalyticsSearchParamsDetailed` (`src/utils/search-params.ts`) | Default for that filter, plus a dismissible "Some filters were reset" notice naming it. The value is never echoed (AC-FLT-8, AC-FLT-11) | 200 | — |
| `agencyId` unknown or outside the state | `resolveFilters` → `view.droppedFilters` | All agencies, same notice (AC-FLT-9) | 200 | — |
| Scope with no listings | Service sets `view.isEmpty` | Zeros, a flat chart and a "No listings for … in this period" note. Not an error (AC-STE-2) | 200 | — |
| State with no agencies | `Filters` | Agency combobox disabled: "No agencies in …" | 200 | — |
| Database missing, locked, unreadable | Repository → `DataUnavailableError` → `loadRentalAnalytics` returns `unavailable` | "We can't reach the listing data right now" + guarded Retry (AC-STE-5) | 200 | `warn analytics_degraded reason=data_unavailable` |
| Dataset breaks an invariant | Repository or `assertPlausibleView` → `DataIntegrityError` → `invalid` | "These figures failed a safety check" + guarded "Check again" (AC-STE-7) | 200 | `error analytics_degraded reason=data_invalid` |
| Anything else thrown while rendering | `src/app/error.tsx` / `global-error.tsx` | "We can't load the figures right now" + guarded Retry (AC-STE-3) | 200 (streamed) | `error request_failed` with `digest` |
| Browser offline | `useOnlineStatus` | "You're offline" banner; filter changes held back (AC-STE-6) | — | — |
| Too many requests | `src/proxy.ts` | A plain HTML page saying how long to wait (JSON under `/api`), with `Retry-After` | 429 | `warn rate_limited` |
| Method other than GET/HEAD | `src/proxy.ts` | A plain HTML "This action isn't supported" page (JSON under `/api`), with `Allow` | 405 | — |
| Unknown route | `not-found.tsx`, `/api/[...path]` | Not-found page, or JSON `{ "error": "Not found" }` (AC-STE-4) | 404 | `info request` for API |
| Not signed in / not allowed (once auth exists) | `unauthorized()` / `forbidden()` → `unauthorized.tsx` / `forbidden.tsx`; in API handlers `withRequestLog` (ADR 0006) | "Please sign in to continue" / "You don't have access to this page", or JSON `{ "error": "Unauthorized" \| "Forbidden" }` | 401 / 403 | `info request` for API |
| Database check | `/api/health` | `{ "status": "error", "database": "unavailable" }` (AC-REL-4) | 503 | `warn health_check_failed` |

## Guarded retry

Every Retry button goes through `useGuardedRetry` (`src/components/hooks/use-guarded-retry.ts`). It allows one attempt at a time and waits 0 s, 5 s, then 15 s between attempts. After three failed attempts it asks the visitor to come back later. A recovering server is never hammered by a stuck button.

## Abstain rule

`assertPlausibleView` (`src/services/rental-analytics.guard.ts`) runs on every built view. If anything is implausible, the whole view is withheld rather than partly shown, because one wrong number on a dashboard undermines all the others. There is deliberately no last-known-good cache: a single process with a read-only file would rarely serve from one, and showing stale figures needs its own banner and expiry rules.

## Adding a failure path

Throw a typed error from `src/utils/errors.ts` with a message that is safe to log. Map it in `loadRentalAnalytics` if the page should render something tailored. Add a row to the table above, and an acceptance criterion in `intent.md`.
