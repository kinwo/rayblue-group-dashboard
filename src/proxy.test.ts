import { NextRequest } from "next/server";
import { handleRequest, proxy } from "@/proxy";
import {
  buildContentSecurityPolicy,
  NON_PAGE_CONTENT_SECURITY_POLICY,
  SECURITY_HEADERS,
} from "@/utils/security-headers";

const NONCE = "bm9uY2U=";
const request = (path: string, method = "GET") => new NextRequest(`http://localhost${path}`, { method });

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
  it("sets a nonce CSP on pages and passes the nonce to rendering", () => {
    const response = handleRequest(request("/?state=NSW"), NONCE);
    const csp = response.headers.get("content-security-policy");
    expect(csp).toContain(`'nonce-${NONCE}'`);
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(NONCE);
    expect(response.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
  });

  it("uses a fresh nonce per request", () => {
    const a = proxy(request("/")).headers.get("content-security-policy");
    const b = proxy(request("/")).headers.get("content-security-policy");
    expect(a).not.toEqual(b);
  });

  it("adds HSTS, nosniff, Referrer-Policy and Permissions-Policy to pages and API responses", () => {
    for (const response of [handleRequest(request("/"), NONCE), handleRequest(request("/api/health"), NONCE)]) {
      for (const [name, value] of Object.entries(SECURITY_HEADERS)) expect(response.headers.get(name)).toBe(value);
    }
  });

  it("gives API and 405 responses the fixed non-page CSP, without a nonce", () => {
    for (const response of [
      handleRequest(request("/api/health"), NONCE),
      handleRequest(request("/api/health", "POST"), NONCE),
      handleRequest(request("/", "POST"), NONCE),
    ]) {
      expect(response.headers.get("content-security-policy")).toBe(NON_PAGE_CONTENT_SECURITY_POLICY);
    }
  });

  it.each(["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])(
    "AC-SEC-1: answers %s with 405 and Allow: GET, HEAD on API and page paths",
    async (method) => {
      const api = handleRequest(request("/api/health", method), NONCE);
      expect(api.status).toBe(405);
      expect(api.headers.get("allow")).toBe("GET, HEAD");
      expect(await api.json()).toEqual({ error: "Method not allowed" });
      const page = handleRequest(request("/", method), NONCE);
      expect(page.status).toBe(405);
      expect(page.headers.get("allow")).toBe("GET, HEAD");
    },
  );

  it("AC-PRV-5: sets no cookies", () => {
    for (const response of [handleRequest(request("/"), NONCE), handleRequest(request("/api/x", "POST"), NONCE)]) {
      expect(response.headers.get("set-cookie")).toBeNull();
    }
  });
});
