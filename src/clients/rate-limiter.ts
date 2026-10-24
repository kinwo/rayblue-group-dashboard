import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";
import { getEnv } from "@/clients/env";

// Per-client request limits (ADR 0004). Counts live in this process's memory, so each
// instance limits on its own and a restart clears them.

/** Pages (documents, RSC navigations, prefetches) and `/api/*` are counted separately. */
export type RateLimitScope = "page" | "api";

export type RateLimitDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Counts one request for `clientKey` in `scope` and says whether it may proceed. */
export type RateLimiter = (scope: RateLimitScope, clientKey: string) => Promise<RateLimitDecision>;

/** Requests per client per minute for each scope; 0 turns that scope's limit off. */
export type RateLimits = Record<RateLimitScope, number>;

const WINDOW_SECONDS = 60;

export function createRateLimiter(limits: RateLimits): RateLimiter {
  const limiters = {
    page: limits.page > 0 ? new RateLimiterMemory({ keyPrefix: "page", points: limits.page, duration: WINDOW_SECONDS }) : null,
    api: limits.api > 0 ? new RateLimiterMemory({ keyPrefix: "api", points: limits.api, duration: WINDOW_SECONDS }) : null,
  };

  return async (scope, clientKey) => {
    const limiter = limiters[scope];
    if (!limiter) return { allowed: true };
    try {
      await limiter.consume(clientKey);
      return { allowed: true };
    } catch (rejection) {
      // The library rejects with a RateLimiterRes when the client is over the limit.
      if (!(rejection instanceof RateLimiterRes)) throw rejection;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(rejection.msBeforeNext / 1000)) };
    }
  };
}

/**
 * The client to count a request against: the last `X-Forwarded-For` entry, which the one
 * trusted reverse proxy in front of the app appends (docs/runbook.md), else `X-Real-IP`.
 * Requests that carry neither share one "unknown" bucket.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

let rateLimiter: RateLimiter | undefined;

/** The process-wide limiter, configured from the validated environment. */
export function getRateLimiter(): RateLimiter {
  const env = getEnv();
  rateLimiter ??= createRateLimiter({ page: env.RATE_LIMIT_PAGES_PER_MINUTE, api: env.RATE_LIMIT_API_PER_MINUTE });
  return rateLimiter;
}
