"use client";

import { RetryErrorView } from "@/components/layout/retry-error-view";

import "./globals.css";

/** Replaces the root layout when it fails, so it brings its own document (Next 16 global-error.js). */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en-AU">
      <body>
        <title>Rental analytics · Rayblue Agency Group</title>
        <main>
          <RetryErrorView onRetry={() => retry()} />
        </main>
      </body>
    </html>
  );
}
