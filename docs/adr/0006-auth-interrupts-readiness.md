# 0006. 401/403 readiness with Next's experimental auth interrupts

Status: accepted · 24 Oct 2026

## Context
The prototype has no sign-in, but a group dashboard will get one, and with it "not signed in" and "not allowed" responses. Without a plan, the first auth check would most likely throw into `error.tsx` ("We can't load the figures right now") or, in an API handler, into `withRequestLog`'s catch-all 500. Both are wrong for an access problem. Next 16 has `unauthorized()` / `forbidden()` with `unauthorized.tsx` / `forbidden.tsx` views, but only behind `experimental.authInterrupts`.

## Decision
- Turn on `experimental.authInterrupts` in `next.config.ts`.
- Add `src/app/unauthorized.tsx` (401) and `src/app/forbidden.tsx` (403). They use `StatusView` with plain copy and a link to Rental analytics, and show no detail, like the other status pages (AC-STE-3).
- In `withRequestLog` (`src/app/api/_lib/respond.ts`), map a thrown `unauthorized()`, `forbidden()` or `notFound()` to JSON `{"error":"Unauthorized" | "Forbidden" | "Not found"}` with its status and `Cache-Control: no-store`, logged as an `info` request line. Next's own handling would return an empty body and skip our log. Interrupts are recognised by their documented digest, `NEXT_HTTP_ERROR_FALLBACK;<status>`. Any other framework interrupt (such as `redirect()`) is passed through with `unstable_rethrow` instead of becoming a 500.
- Nothing calls `unauthorized()` or `forbidden()` yet. The future auth layer only has to call them from a page, a data function a page awaits, or a route handler.

## Consequences
- We depend on an experimental flag. If Next renames or drops it, the two views and the digest check in `respond.ts` (covered by tests) are the only places to change.
- A page that calls `forbidden()` after streaming has started gets the view with status 200, not 403 (Next behaviour). Auth checks should run before the first `await` that streams, or in the data function behind `loading.tsx`.
- See [docs/error-handling.md](../error-handling.md) for how this fits with the other failure paths.
