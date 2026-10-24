# 0004. In-app rate limiting with rate-limiter-flexible

Status: accepted · 24 Oct 2026

## Context
ADR 0003 and the runbook left rate limiting to the host or reverse proxy. Every page request renders dynamically and reads SQLite (no static shell, see ADR 0003), so a single client can make the server do real work as fast as it can send requests. We want a limit that ships with the app and is tested with it, so a host that forgets the proxy rule is still covered.

## Decision
- `src/proxy.ts` counts every request it sees against the client's per-minute budget before anything else, rejected methods included. Over the budget, it answers `429` with `Retry-After` and `Cache-Control: no-store`: JSON `{"error":"Too many requests"}` under `/api`, plain text for pages. The security headers and the non-page CSP still apply. It logs one `rate_limited` warning with route, method and scope, never the client address.
- Limits are counted separately for pages (documents, RSC navigations and link prefetches) and for `/api/*`. Defaults are 120 and 30 requests per client per minute, set by `RATE_LIMIT_PAGES_PER_MINUTE` and `RATE_LIMIT_API_PER_MINUTE`; `0` turns a limit off. Static files are outside the proxy matcher and are never counted.
- `rate-limiter-flexible`'s `RateLimiterMemory` is configured in `src/clients/rate-limiter.ts`. It is small, has no runtime dependencies, and offers Redis and other stores behind the same interface if we ever run more than one instance.
- The client is the last `X-Forwarded-For` entry (the one the trusted reverse proxy appends), else `X-Real-IP`, else one shared `unknown` bucket.

## Consequences
- Counts live in one process's memory: each instance limits on its own, and a restart clears them. With N instances behind a load balancer a client gets up to N times the limit; move to a shared store before scaling out.
- The client key is only as good as the proxy in front. Exposed directly to the internet, a client can send its own `X-Forwarded-For` and get a fresh bucket per request; without any proxy header, all clients share one bucket. The runbook therefore still requires exactly one reverse proxy that sets or appends `X-Forwarded-For`.
- The host-level limit in the runbook stays as the outer layer (it also absorbs floods before they reach Node); the in-app limit is the inner one.
