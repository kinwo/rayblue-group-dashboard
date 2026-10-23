import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./src/utils/security-headers";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
