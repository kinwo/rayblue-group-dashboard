import { NextResponse, type NextRequest } from "next/server";
import { ALLOWED_METHODS, buildContentSecurityPolicy, SECURITY_HEADERS } from "@/utils/security-headers";

const ALLOW = ALLOWED_METHODS.join(", ");

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  return response;
}

function methodNotAllowed(isApi: boolean): NextResponse {
  const headers = { Allow: ALLOW, "Cache-Control": "no-store" };
  return isApi
    ? NextResponse.json({ error: "Method not allowed" }, { status: 405, headers })
    : new NextResponse("Method not allowed", { status: 405, headers: { ...headers, "Content-Type": "text/plain" } });
}

function newNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

/**
 * Runs before every route. Rejects any method but GET/HEAD (the app has no write paths,
 * AC-SEC-1) and gives each page a fresh nonce CSP (AC-SEC-4). Sets no cookies (AC-PRV-5).
 */
export function proxy(request: NextRequest): NextResponse {
  return handleRequest(request, newNonce());
}

/** `proxy` with the nonce injected, for tests. */
export function handleRequest(request: NextRequest, nonce: string): NextResponse {
  const isApi = request.nextUrl.pathname === "/api" || request.nextUrl.pathname.startsWith("/api/");
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
