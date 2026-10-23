import { PageContent } from "@/components/layout/page-content";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { STATE_CODES } from "@/utils/states";

/** Header row plus the top eight agencies. */
const TABLE_ROWS = 9;
const block = "bg-surface-sunken";

function CardFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-4 rounded-lg border border-line bg-surface-raised p-4", className)}>
      <div className="flex flex-col gap-1">
        <Skeleton className={cn(block, "h-6 w-48")} />
        <Skeleton className={cn(block, "h-4 w-64 max-w-full")} />
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
      <div className="flex flex-col gap-1 border-b border-line bg-surface-raised px-6 pt-5 pb-4">
        <Skeleton className={cn(block, "h-7 w-52")} />
        <Skeleton className={cn(block, "h-4 w-96 max-w-full")} />
      </div>
      <PageContent>
        <Skeleton data-testid="skeleton-filters" className={cn(block, "h-[78px] rounded-lg")} />
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              key={i}
              data-testid="skeleton-kpi"
              className="h-[108px] flex-[1_1_220px] rounded-lg border border-line bg-surface-raised"
            />
          ))}
        </div>
        <CardFrame>
          <Skeleton data-testid="skeleton-trend" className={cn(block, "h-60")} />
        </CardFrame>
        <div className="flex flex-wrap gap-6">
          <CardFrame className="flex-[1_1_380px]">
            {STATE_CODES.map((code) => (
              <Skeleton key={code} data-testid="skeleton-state-row" className={cn(block, "h-8")} />
            ))}
          </CardFrame>
          <CardFrame className="flex-[1.4_1_480px]">
            {Array.from({ length: TABLE_ROWS }, (_, i) => (
              <Skeleton key={i} data-testid="skeleton-table-row" className={cn(block, "h-10")} />
            ))}
          </CardFrame>
        </div>
      </PageContent>
    </div>
  );
}
