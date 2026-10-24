import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate, formatTime } from "@/utils/format";

import styles from "@/components/layout/page-header.module.css";

type PageHeaderProps = {
  title: string;
  /** "All states and territories", a state or an agency name. */
  scopeLabel: string;
  /** Dataset as-of time, UTC ms. */
  asOf: number;
  isStale: boolean;
};

/** "9:00 am, 24 Oct 2026" in Sydney time. */
export function updatedAt(asOf: number): string {
  return `${formatTime(asOf)}, ${formatDate(asOf)}`;
}

/** Page header band (DESIGN.md §6): one h1 and the "<scope> · Sample data · Updated …" meta line (AC-HDR-1, AC-PRV-4). */
export function PageHeader({ title, scopeLabel, asOf, isStale }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.meta}>
          {scopeLabel} · Sample data · Updated {updatedAt(asOf)}
        </p>
      </div>
      {isStale ? <StaleDataAlert asOf={asOf} /> : null}
    </header>
  );
}

/** Shown when the server clock is more than 24 hours past the as-of time (AC-HDR-2). */
function StaleDataAlert({ asOf }: { asOf: number }) {
  return (
    <Alert className={styles.staleAlert}>
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle className={styles.staleTitle}>Figures may be out of date</AlertTitle>
      <AlertDescription className={styles.staleText}>
        The data was last updated at {updatedAt(asOf)}, more than a day ago.
      </AlertDescription>
    </Alert>
  );
}
