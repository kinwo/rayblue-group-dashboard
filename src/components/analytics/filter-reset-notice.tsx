"use client";

import { InfoIcon, XIcon } from "lucide-react";
import { useState } from "react";

import { FILTER_LABELS, GRANULARITY_LABELS } from "@/components/analytics/filters";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DEFAULT_FILTERS, type FilterKey } from "@/utils/search-params";
import { ALL_STATES_LABEL } from "@/utils/states";

import styles from "@/components/analytics/filter-reset-notice.module.css";

/** What each reset filter falls back to, in words. */
const FALLBACK: Record<FilterKey, string> = {
  state: ALL_STATES_LABEL.toLowerCase(),
  agencyId: "all agencies",
  granularity: `${GRANULARITY_LABELS[DEFAULT_FILTERS.granularity].toLowerCase()} figures`,
};

/** "The Agency filter in this link … so we're showing all agencies." Never echoes the value (AC-FLT-8). */
export function resetSentence(key: FilterKey): string {
  return `The ${FILTER_LABELS[key]} filter in this link wasn't recognised or isn't available here, so we're showing ${FALLBACK[key]}.`;
}

/**
 * Tells the visitor which filters from the URL were reset (AC-FLT-11). It goes away once
 * any filter changes, because the new URL only holds valid params, and can be dismissed.
 */
export function FilterResetNotice({ reset }: { reset: readonly FilterKey[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (reset.length === 0 || dismissed) return null;
  return (
    <Alert role="status" className={styles.notice}>
      <InfoIcon aria-hidden="true" />
      <AlertTitle className={styles.title}>Some filters were reset</AlertTitle>
      <AlertDescription className={styles.text}>
        <ul className={styles.list}>
          {reset.map((key) => (
            <li key={key}>{resetSentence(key)}</li>
          ))}
        </ul>
      </AlertDescription>
      <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={() => setDismissed(true)} className={styles.dismiss}>
        <XIcon aria-hidden="true" />
      </Button>
    </Alert>
  );
}
