import { AnalyticsCard } from "@/components/analytics/analytics-card";
import { highlightedState, trendRangeLabel } from "@/components/analytics/scope";
import type { RentalAnalyticsView } from "@/services/rental-analytics.types";
import { SINGLE_SERIES_COLOR } from "@/utils/chart-colors";
import { cn } from "@/utils/cn";
import { formatAgencyCount, formatCount } from "@/utils/format";
import { ALL_STATES_LABEL, stateName } from "@/utils/states";

type StateBarsProps = Pick<RentalAnalyticsView, "byState" | "scope" | "trend">;

/** Bar width as a percentage of the highest value (0 when every value is 0). */
export function barPercent(count: number, max: number): number {
  return max > 0 ? (count / max) * 100 : 0;
}

/** "New listings by state" (F5): every state, highest first, other bars faded when one is highlighted. */
export function StateBars({ byState, scope, trend }: StateBarsProps) {
  const highlighted = highlightedState(scope);
  const rows = [...byState].sort((a, b) => b.count - a.count);
  const max = Math.max(0, ...rows.map((r) => r.count));
  const range = trendRangeLabel(trend.points, trend.granularity);
  const description = highlighted
    ? `${range} · ${stateName(highlighted)} highlighted`
    : `${range} · ${ALL_STATES_LABEL}`;

  return (
    <AnalyticsCard title="New listings by state" description={description} className="flex-[1_1_380px]">
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.state}
            aria-current={row.state === highlighted ? "true" : undefined}
            className="grid grid-cols-[112px_1fr_64px] items-center gap-3"
          >
            <span className="flex flex-col">
              <abbr title={stateName(row.state)} className="text-caption-strong text-ink no-underline">
                {row.state}
              </abbr>
              <span className="sr-only">{stateName(row.state)}</span>
              <span className="text-caption text-ink-muted">{formatAgencyCount(row.agencyCount)}</span>
            </span>
            <span aria-hidden="true" className="h-4.5 border-l border-line-strong">
              {/* Only the bar fades: faded labels and counts would fail text contrast (WCAG 1.4.3). */}
              <span
                className={cn(
                  "block h-full rounded-r-sm transition-opacity",
                  highlighted && row.state !== highlighted && "opacity-35",
                )}
                style={{ width: `${barPercent(row.count, max)}%`, backgroundColor: SINGLE_SERIES_COLOR }}
              />
            </span>
            <span className="text-right text-caption-strong text-ink tabular-nums">{formatCount(row.count)}</span>
          </li>
        ))}
      </ul>
    </AnalyticsCard>
  );
}
