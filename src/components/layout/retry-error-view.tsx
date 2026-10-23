"use client";

import { StatusView } from "@/components/layout/status-view";
import { Button } from "@/components/ui/button";

export const ERROR_TITLE = "We can't load the figures right now";
export const ERROR_MESSAGE =
  "Something went wrong on our side. Please try again in a moment. If it keeps happening, the data may be unavailable.";

/**
 * The error view for route and root error boundaries. It takes only a retry
 * callback, never the error, so no message, stack, digest or path can reach the page (AC-STE-3).
 */
export function RetryErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <StatusView
      title={ERROR_TITLE}
      message={ERROR_MESSAGE}
      action={
        <Button onClick={onRetry} className="h-9 bg-primary px-4 text-label text-on-primary hover:bg-primary-hover">
          Retry
        </Button>
      }
    />
  );
}
