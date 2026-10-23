"use client";

import { RetryErrorView } from "@/components/layout/retry-error-view";

/**
 * Route error boundary, rendered inside the app shell's <main>: a database
 * outage, a corrupt dataset or a failed server render lands here. `retry()`
 * re-fetches and re-renders the segment (Next 16 error.js). The error itself
 * is deliberately unused, so nothing about it reaches the page (AC-STE-3).
 */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return <RetryErrorView onRetry={() => retry()} />;
}
