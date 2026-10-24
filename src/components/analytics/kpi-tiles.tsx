import type { RentalAnalyticsView } from "@/services/rental-analytics.types";
import { formatCount, formatMonth, formatTime, formatWeekday } from "@/utils/format";
import { stateName } from "@/utils/states";

import layout from "@/components/analytics/analytics-layout.module.css";
import styles from "@/components/analytics/kpi-tiles.module.css";
import { highlightedState } from "@/components/analytics/scope";
import { cn } from "@/utils/cn";

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
      <ul className={layout.kpiRow}>
        {kpiTiles(props).map((tile) => (
          <li key={tile.label} className={cn(layout.kpiCell, styles.tile)}>
            <span className={styles.label}>{tile.label}</span>
            <span className={styles.value}>{formatCount(tile.value)}</span>
            <span className={styles.note}>{tile.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
