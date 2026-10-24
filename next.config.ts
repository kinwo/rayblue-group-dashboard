import type { NextConfig } from "next";
import { NON_PAGE_CONTENT_SECURITY_POLICY, SECURITY_HEADERS } from "./src/utils/security-headers";

// Paths src/proxy.ts skips (see its matcher); they get the fixed non-page CSP here instead.
const STATIC_PATHS = ["/_next/static/:path*", "/_next/image", "/favicon.ico"];

const nextConfig: NextConfig = {
  // No Cache Components / partial prerendering: a prerendered static shell cannot carry the
  // per-request CSP nonce, so every route renders dynamically (Next CSP guide, ADR 0003).
  cacheComponents: false,
  poweredByHeader: false,
  // Pages also get a per-request CSP from src/proxy.ts (AC-SEC-4).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
      },
      ...STATIC_PATHS.map((source) => ({
        source,
        headers: [{ key: "Content-Security-Policy", value: NON_PAGE_CONTENT_SECURITY_POLICY }],
      })),
    ];
  },
  turbopack: {
    rules: {
      // Turbopack names the loader's output after `as`, so CSS modules must come out as
      // `*.module.css` or Next treats them as global CSS (ADR 0005).
      "*.css": [
        { condition: { path: "*.module.css" }, loaders: ["@tailwindcss/turbopack"], as: "*.module.css" },
        { condition: { not: { path: "*.module.css" } }, loaders: ["@tailwindcss/turbopack"], as: "*.css" },
      ],
    },
  },
};

export default nextConfig;
