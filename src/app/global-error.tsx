"use client";

import { RetryErrorView } from "@/components/layout/retry-error-view";

import "./globals.css";

/** Replaces the root layout when it fails, so it brings its own document (Next 16 global-error.js). */
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en-AU">
      <body>
        <title>Rental analytics · Rayblue Agency Group</title>
        {/* No metadata or viewport exports in global-error; React hoists these into <head>. */}
        <meta name="color-scheme" content="light dark" />
        <meta name="text-scale" content="scale" />
        <main>
          <RetryErrorView onRetry={() => retry()} />
        </main>
      </body>
    </html>
  );
}
