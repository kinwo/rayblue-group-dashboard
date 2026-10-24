import { CardRow } from "@/components/analytics/analytics-layout";
import layout from "@/components/analytics/analytics-layout.module.css";
import { PageContent } from "@/components/layout/page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { STATE_CODES } from "@/utils/states";

import styles from "@/components/analytics/rental-analytics-skeleton.module.css";

/** Header row plus the top eight agencies. */
const TABLE_ROWS = 9;

function CardFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn(styles.frame, className)}>
      <div className={styles.frameHeading}>
        <Skeleton className={cn(styles.block, styles.cardTitle)} />
        <Skeleton className={cn(styles.block, styles.cardDescription)} />
      </div>
      {children}
    </div>
  );
}

/**
 * Loading state shaped like the final page (AC-STE-1): header, filter bar,
 * four KPI tiles, a 240px trend plot, eight state rows and the table rows.
 */
export function RentalAnalyticsSkeleton() {
  return (
    <div aria-busy="true">
      <p role="status" className="sr-only">
        Loading rental analytics
      </p>
      <div className={styles.header}>
        <Skeleton className={cn(styles.block, styles.pageTitle)} />
        <Skeleton className={cn(styles.block, styles.pageMeta)} />
      </div>
      <PageContent>
        <Skeleton data-testid="skeleton-filters" className={cn(styles.block, styles.filters)} />
        <div className={layout.kpiRow}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} data-testid="skeleton-kpi" className={cn(layout.kpiCell, styles.kpi)} />
          ))}
        </div>
        <CardFrame>
          <Skeleton data-testid="skeleton-trend" className={cn(styles.block, styles.trend)} />
        </CardFrame>
        <CardRow>
          <CardFrame className={layout.stateColumn}>
            {STATE_CODES.map((code) => (
              <Skeleton key={code} data-testid="skeleton-state-row" className={cn(styles.block, styles.stateRow)} />
            ))}
          </CardFrame>
          <CardFrame className={layout.tableColumn}>
            {Array.from({ length: TABLE_ROWS }, (_, i) => (
              <Skeleton key={i} data-testid="skeleton-table-row" className={cn(styles.block, styles.tableRow)} />
            ))}
          </CardFrame>
        </CardRow>
      </PageContent>
    </div>
  );
}
