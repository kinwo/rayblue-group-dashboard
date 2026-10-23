import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDate, formatTime } from "@/utils/format";

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
    <header className="flex flex-col gap-3 border-b border-line bg-surface-raised px-6 pt-5 pb-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-title text-ink">{title}</h1>
        <p className="text-caption text-ink-muted">
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
    <Alert className="border-warning/40 bg-warning-soft text-warning">
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle className="text-subheading">Figures may be out of date</AlertTitle>
      <AlertDescription className="text-body text-ink">
        The data was last updated at {updatedAt(asOf)}, more than a day ago.
      </AlertDescription>
    </Alert>
  );
}
