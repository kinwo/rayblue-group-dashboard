import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/utils/security-headers";

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
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
