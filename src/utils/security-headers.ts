// Security headers (AC-SEC-4, ADR 0003). One home for the policy: proxy.ts adds the
// per-request CSP to pages; next.config.ts adds the rest to every response.

/** Headers every response carries, pages, API and static files alike. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/**
 * Content Security Policy for one page response. Scripts and `<style>` elements need the
 * nonce; style *attributes* are allowed inline because Recharts and the sidebar position
 * elements with them (agreed with the UI owner). Everything else is same-origin only.
 */
export function buildContentSecurityPolicy(nonce: string, { isDev }: { isDev: boolean }): string {
  const directives: [string, ...string[]][] = [
    ["default-src", "'self'"],
    // React uses eval in development only, to rebuild server error stacks.
    ["script-src", "'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    ["style-src", "'self'", `'nonce-${nonce}'`],
    ["style-src-attr", "'unsafe-inline'"],
    ["img-src", "'self'"],
    ["font-src", "'self'"],
    ["connect-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ...(isDev ? [] : ([["upgrade-insecure-requests"]] as [string][])),
  ];
  return directives.map((d) => d.join(" ")).join("; ");
}

/** HTTP methods the app answers; everything else is 405 (AC-SEC-1). */
export const ALLOWED_METHODS = ["GET", "HEAD"] as const;
