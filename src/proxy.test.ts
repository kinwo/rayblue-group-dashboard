import { NextRequest } from "next/server";
import { createRateLimiter } from "@/clients/rate-limiter";
import { handleRequest, proxy } from "@/proxy";
import {
  buildContentSecurityPolicy,
  NON_PAGE_CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
} from "@/utils/security-headers";

const NONCE = "bm9uY2U=";
const request = (path: string, method = "GET", headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost${path}`, { method, headers });
const unlimited = createRateLimiter({ page: 0, api: 0 });
const handle = (req: NextRequest) => handleRequest(req, { nonce: NONCE, rateLimiter: unlimited });

function directives(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values];
    }),
  );
}

describe("buildContentSecurityPolicy (AC-SEC-4)", () => {
  const prod = directives(buildContentSecurityPolicy(NONCE, { isDev: false }));
  const dev = directives(buildContentSecurityPolicy(NONCE, { isDev: true }));

  it("allows scripts, styles, fonts and images from the app's own origin only", () => {
    expect(prod.get("default-src")).toEqual(["'self'"]);
    expect(prod.get("script-src")).toEqual(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"]);
    expect(prod.get("style-src")).toEqual(["'self'", `'nonce-${NONCE}'`]);
    expect(prod.get("img-src")).toEqual(["'self'"]);
    expect(prod.get("font-src")).toEqual(["'self'"]);
    expect(prod.get("connect-src")).toEqual(["'self'"]);
  });

  it("blocks plugins, base rewriting, framing and foreign form targets", () => {
    expect(prod.get("object-src")).toEqual(["'none'"]);
    expect(prod.get("base-uri")).toEqual(["'self'"]);
    expect(prod.get("frame-ancestors")).toEqual(["'none'"]);
    expect(prod.get("form-action")).toEqual(["'self'"]);
    expect(prod.has("upgrade-insecure-requests")).toBe(true);
  });

  it("allows inline style attributes only, never inline <style> or script without the nonce", () => {
    expect(prod.get("style-src-attr")).toEqual(["'unsafe-inline'"]);
    for (const [name, values] of prod) {
      if (name !== "style-src-attr") expect(values).not.toContain("'unsafe-inline'");
    }
  });

  it("non-page policy is same-origin only and blocks plugins, base rewriting and framing", () => {
    const fixed = directives(NON_PAGE_CONTENT_SECURITY_POLICY);
    for (const name of ["script-src", "style-src", "img-src", "font-src"]) expect(fixed.get(name)).toEqual(["'self'"]);
    expect(fixed.get("object-src")).toEqual(["'none'"]);
    expect(fixed.get("base-uri")).toEqual(["'self'"]);
    expect(fixed.get("frame-ancestors")).toEqual(["'none'"]);
  });

  it("adds 'unsafe-eval' in development only", () => {
    expect(prod.get("script-src")).not.toContain("'unsafe-eval'");
    expect(dev.get("script-src")).toContain("'unsafe-eval'");
    expect(dev.has("upgrade-insecure-requests")).toBe(false);
  });
});

describe("proxy", () => {
  it("sets a nonce CSP on pages and passes the nonce to rendering", async () => {
    const response = await handle(request("/?state=NSW"));
    const csp = response.headers.get("content-security-policy");
    expect(csp).toContain(`'nonce-${NONCE}'`);
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(NONCE);
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
  });

  it("uses a fresh nonce per request", async () => {
    const a = (await proxy(request("/"))).headers.get("content-security-policy");
    const b = (await proxy(request("/"))).headers.get("content-security-policy");
    expect(a).not.toEqual(b);
  });

  it("adds HSTS, nosniff, Referrer-Policy and Permissions-Policy to pages and API responses", async () => {
    for (const response of [await handle(request("/")), await handle(request("/api/health"))]) {
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(response.headers.get(name)).toBe(value);
    }
  });

  it("gives API and 405 responses the fixed non-page CSP, without a nonce", async () => {
    for (const response of [
      await handle(request("/api/health")),
      await handle(request("/api/health", "POST")),
      await handle(request("/", "POST")),
    ]) {
      expect(response.headers.get("content-security-policy")).toBe(NON_PAGE_CONTENT_SECURITY_POLICY);
    }
  });

  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "AC-SEC-1: answers %s with 405 and Allow: GET, HEAD on API and page paths",
    async (method) => {
      const api = await handle(request("/api/health", method));
      expect(api.status).toBe(405);
      expect(api.headers.get("allow")).toBe("GET, HEAD");
      expect(await api.json()).toEqual({ error: "Method not allowed" });
      const page = await handle(request("/", method));
      expect(page.status).toBe(405);
      expect(page.headers.get("allow")).toBe("GET, HEAD");
    },
  );

  it("AC-PRV-5: sets no cookies", async () => {
    for (const response of [await handle(request("/")), await handle(request("/api/x", "POST"))]) {
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });
});

describe("proxy rate limiting (ADR 0004)", () => {
  const client = { "x-forwarded-for": "203.0.113.7" };
  let lines: string[];

  beforeEach(() => {
    lines = [];
    jest.spyOn(console, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
  });
  afterEach(() => jest.restoreAllMocks());

  const limitedTo = (page: number, api: number) => {
    const rateLimiter = createRateLimiter({ page, api });
    return (req: NextRequest) => handleRequest(req, { nonce: NONCE, rateLimiter });
  };

  it("answers an API client over its limit with JSON 429 and Retry-After", async () => {
    const send = limitedTo(10, 1);
    expect((await send(request("/api/health", "GET", client))).status).toBe(200);
    const limited = await send(request("/api/health", "GET", client));
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThanOrEqual(1);
    expect(limited.headers.get("cache-control")).toBe("no-store");
    expect(await limited.json()).toEqual({ error: "Too many requests" });
  });

  it("answers a page client over its limit with plain-text 429 and the security headers", async () => {
    const send = limitedTo(1, 10);
    await send(request("/rental-analytics", "GET", client));
    const limited = await send(request("/rental-analytics?state=NSW", "GET", client));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("content-type")).toBe("text/plain");
    expect(await limited.text()).toBe("Too many requests");
    expect(limited.headers.get("content-security-policy")).toBe(NON_PAGE_CONTENT_SECURITY_POLICY);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(limited.headers.get(name)).toBe(value);
  });

  it("counts pages and API separately, and each client separately", async () => {
    const send = limitedTo(1, 1);
    expect((await send(request("/", "GET", client))).status).toBe(200);
    expect((await send(request("/api/health", "GET", client))).status).toBe(200);
    expect((await send(request("/", "GET", { "x-forwarded-for": "198.51.100.2" }))).status).toBe(200);
    expect((await send(request("/", "GET", client))).status).toBe(429);
  });

  it("counts rejected methods too, so 405s cannot be used to probe for free", async () => {
    const send = limitedTo(1, 1);
    expect((await send(request("/", "POST", client))).status).toBe(405);
    expect((await send(request("/", "GET", client))).status).toBe(429);
  });

  it("logs one warning with route and scope, never the client address", async () => {
    const send = limitedTo(1, 1);
    await send(request("/api/health", "GET", client));
    await send(request("/api/health", "GET", client));
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({
      level: "warn",
      msg: "rate_limited",
      route: "/api/health",
      method: "GET",
      status: 429,
      reason: "api",
    });
    expect(lines[0]).not.toContain("203.0.113.7");
  });
});
