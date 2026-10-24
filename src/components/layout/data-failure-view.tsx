"use client";

import { useRouter } from "next/navigation";

import { RetryErrorView } from "@/components/layout/retry-error-view";

export type DataFailureKind = "unavailable" | "invalid";

const COPY: Record<DataFailureKind, { title: string; message: string; retryLabel: string }> = {
  unavailable: {
    title: "We can't reach the listing data right now",
    message: "The data source isn't responding. This is usually brief, so please try again in a moment.",
    retryLabel: "Retry",
  },
  invalid: {
    title: "These figures failed a safety check",
    message:
      "Rather than show numbers that may be wrong, we've held them back. The problem has been logged; please check again later.",
    retryLabel: "Check again",
  },
};

/**
 * Shown in place of the dashboard when the data is unavailable (transient) or failed the
 * plausibility guard (safe abstain). Retry re-renders the page on the server (AC-STE-5).
 */
export function DataFailureView({ kind }: { kind: DataFailureKind }) {
  const router = useRouter();
  return <RetryErrorView {...COPY[kind]} onRetry={() => router.refresh()} />;
}
