"use client";

import { useGuardedRetry } from "@/components/hooks/use-guarded-retry";
import { StatusView } from "@/components/layout/status-view";
import { Button } from "@/components/ui/button";

import styles from "@/components/layout/retry-error-view.module.css";

export const ERROR_TITLE = "We can't load the figures right now";
export const ERROR_MESSAGE =
  "Something went wrong on our side. Please try again in a moment. If it keeps happening, the data may be unavailable.";
export const EXHAUSTED_MESSAGE =
  "It's still not working after a few tries. Please come back in a few minutes; the problem has been logged.";

type RetryErrorViewProps = {
  onRetry: () => void;
  title?: string;
  message?: string;
  retryLabel?: string;
};

/**
 * The error view for route and root error boundaries and degraded data. It takes only copy
 * and a retry callback, never the error, so no message, stack, digest or path can reach the
 * page (AC-STE-3). Retries are guarded: one at a time, with a growing cooldown (AC-STE-5).
 */
export function RetryErrorView({ onRetry, title = ERROR_TITLE, message = ERROR_MESSAGE, retryLabel = "Retry" }: RetryErrorViewProps) {
  const retry = useGuardedRetry(onRetry);
  const status = retry.isPending ? "Trying again…" : retry.attempts > 0 ? "Still not working." : "";
  return (
    <StatusView
      title={title}
      message={retry.exhausted ? EXHAUSTED_MESSAGE : message}
      action={
        <div className={styles.actions}>
          <Button onClick={retry.onRetry} disabled={retry.disabled} aria-busy={retry.isPending} className={styles.retry}>
            {retryLabel}
          </Button>
          <p role="status" className={styles.status}>
            {status}
          </p>
        </div>
      }
    />
  );
}
