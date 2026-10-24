# 0003. Read-only SQLite at runtime, nonce CSP in proxy, fail fast at start-up

Status: accepted · 24 Oct 2026

## Context
The app is public with no sign-in (intent §4) and must be safe under failure: database missing, locked or corrupt; unknown or unavailable endpoints; malformed input.

## Decision
- The runtime opens SQLite with `readonly` and `fileMustExist`. Only `db:migrate` and `db:seed` open it read-write, at build time (AC-REL-3, AC-SEC-3).
- Every driver error is mapped in `src/data` to `DataUnavailableError` (safe message, original kept as `cause` for server logs). Pages let it reach `error.tsx`, which shows a plain message and Retry. `/api/health` returns 503 with `database: "unavailable"`.
- `src/instrumentation.ts` validates env, the DB file and the applied migrations at start-up and exits non-zero with one JSON log line on failure (AC-REL-5).
- `src/proxy.ts` sets a per-request nonce CSP with `'strict-dynamic'`. Nonces only reach scripts rendered per request, and Next's CSP guide states that Partial Prerendering is incompatible with them: a prerendered static shell has no nonce, so the browser blocks every script and the page never hydrates. We therefore turn `cacheComponents` (and PPR) off and call `connection()` in the root layout, so every route renders dynamically. The cost is negligible here: the app is read-only, one page, small data. Hash-based SRI was rejected because it does not cover Next's inline RSC scripts. `style-src` uses the nonce for `<style>` elements and allows inline style attributes only (`style-src-attr 'unsafe-inline'`) for Recharts. In addition, `next.config.ts` adds HSTS, `nosniff`, Referrer-Policy and Permissions-Policy to every response, with `X-Powered-By` off.
- Only `GET` route handlers exist. A catch-all under `/api` returns JSON 404 for unknown paths and 405 for other methods.

## Consequences
- No write path exists at runtime, so a compromised request cannot alter data.
- A broken release fails at start, not on the first request.
