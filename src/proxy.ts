import { NextResponse, type NextRequest } from "next/server";
import { clientKey, getRateLimiter, type RateLimiter } from "@/clients/rate-limiter";
import { logger } from "@/utils/logger";
import {
  ALLOWED_METHODS,
  buildContentSecurityPolicy,
  NON_PAGE_CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
} from "@/utils/security-headers";

const ALLOW = ALLOWED_METHODS.join(", ");

/** Adds the shared headers, and the non-page CSP unless a page CSP is already set. */
function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  if (!response.headers.has("Content-Security-Policy")) {
    response.headers.set("Content-Security-Policy", NON_PAGE_CONTENT_SECURITY_POLICY);
  }
  return response;
}

function methodNotAllowed(isApi: boolean): NextResponse {
  const headers = { Allow: ALLOW, "Cache-Control": "no-store" };
  return isApi
    ? NextResponse.json({ error: "Method not allowed" }, { status: 405, headers })
    : new NextResponse("Method not allowed", { status: 405, headers: { ...headers, "Content-Type": "text/plain" } });
}

function tooManyRequests(isApi: boolean, retryAfterSeconds: number): NextResponse {
  const headers = { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" };
  return isApi
    ? NextResponse.json({ error: "Too many requests" }, { status: 429, headers })
    : new NextResponse("Too many requests", { status: 429, headers: { ...headers, "Content-Type": "text/plain" } });
}

function newNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Runs before every route. Answers clients over their per-minute limit with 429 (ADR 0004),
 * rejects any method but GET/HEAD (the app has no write paths, AC-SEC-1) and gives each
 * page a fresh nonce CSP (AC-SEC-4). Sets no cookies (AC-PRV-5).
 */
export function proxy(request: NextRequest): Promise<NextResponse> {
  return handleRequest(request, { nonce: newNonce(), rateLimiter: getRateLimiter() });
}

/** `proxy` with the nonce and rate limiter injected, for tests. */
export async function handleRequest(
  request: NextRequest,
  { nonce, rateLimiter }: { nonce: string; rateLimiter: RateLimiter },
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const isApi = pathname === "/api" || pathname.startsWith("/api/");
  const decision = await rateLimiter(isApi ? "api" : "page", clientKey(request.headers));
  if (!decision.allowed) {
    // The client address stays out of the log (docs/runbook.md: logs hold no personal data).
    logger.warn("rate_limited", { route: pathname, method: request.method, status: 429, reason: isApi ? "api" : "page" });
    return withSecurityHeaders(tooManyRequests(isApi, decision.retryAfterSeconds));
  }
  if (!(ALLOWED_METHODS as readonly string[]).includes(request.method)) {
    return withSecurityHeaders(methodNotAllowed(isApi));
  }
  if (isApi) return withSecurityHeaders(NextResponse.next());

  const csp = buildContentSecurityPolicy(nonce, { isDev: process.env.NODE_ENV === "development" });
  // Next.js reads the nonce from the request's CSP header and applies it to its scripts and styles.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return withSecurityHeaders(response);
}

export const config = {
  // Static build output needs no nonce; next.config.ts still adds the other headers to it.
  // Dev-only `/__nextjs*` tooling endpoints are left alone.
  matcher: ["/((?!_next/static|_next/image|__nextjs|favicon.ico).*)"],
};
