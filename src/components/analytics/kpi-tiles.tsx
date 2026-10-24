import type { RentalAnalyticsView } from "@/services/rental-analytics.types";
import { formatCount, formatMonth, formatTime, formatWeekday } from "@/utils/format";
import { stateName } from "@/utils/states";

import { highlightedState } from "@/components/analytics/scope";

type KpiTilesProps = Pick<RentalAnalyticsView, "kpis" | "scope" | "asOf">;

type Tile = { label: string; value: number; note: string };

/** The four tiles; they ignore the listing period (AC-KPI-5). */
export function kpiTiles({ kpis, scope, asOf }: KpiTilesProps): Tile[] {
  const state = highlightedState(scope);
  return [
    {
      label: "New listings today",
      value: kpis.today.current,
      note: `To ${formatTime(asOf)} · last ${formatWeekday(kpis.today.previousStart)} ${formatCount(kpis.today.previous)}`,
    },
    {
      label: "New listings this week",
      value: kpis.thisWeek.current,
      note: `Week to date · last week ${formatCount(kpis.thisWeek.previous)}`,
    },
    {
      label: "New listings this month",
      value: kpis.thisMonth.current,
      note: `Month to date · ${formatMonth(kpis.thisMonth.previousStart)} ${formatCount(kpis.thisMonth.previous)}`,
    },
    {
      label: "Agencies",
      value: kpis.agencyCount,
      note: state ? `In ${stateName(state)}` : `Across ${formatCount(kpis.stateCount)} states and territories`,
    },
  ];
}

/** KPI row (DESIGN.md §6 › KPI tile): label, tabular value never coloured, comparison note. */
export function KpiTiles(props: KpiTilesProps) {
  return (
    <section aria-labelledby="listing-totals-heading">
      <h2 id="listing-totals-heading" className="sr-only">
        Listing totals
      </h2>
      <ul className="flex flex-wrap gap-4">
        {kpiTiles(props).map((tile) => (
          <li
            key={tile.label}
            className="flex min-w-0 flex-[1_1_220px] flex-col gap-1 rounded-lg border border-line bg-surface-raised p-4"
          >
            <span className="text-caption-strong text-ink-muted">{tile.label}</span>
            <span className="text-display text-ink tabular-nums">{formatCount(tile.value)}</span>
            <span className="text-caption text-ink-muted">{tile.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
