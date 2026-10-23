// Rental analytics use case: one bounded read of listing times, aggregated in memory.
import { getListingRepository } from "@/data/listing-repository";
import { countByBucket, kpiPeriods, previousRange, trendRange } from "@/utils/date-buckets";
import type { AnalyticsFilters } from "@/utils/search-params";
import { STATE_CODES } from "@/utils/states";
import {
  agenciesInState,
  buildScope,
  isStale,
  periodCount,
  rankAgencies,
  resolveFilters,
  scopePredicate,
  stateRows,
  topAgencyRows,
} from "@/services/rental-analytics.aggregate";
import type { GetRentalAnalytics, RentalAnalyticsView } from "@/services/rental-analytics.types";

/**
 * Builds the whole view for `filters`. Repository errors (`DataUnavailableError`,
 * `DataIntegrityError`) propagate unchanged.
 */
export const getRentalAnalytics: GetRentalAnalytics = async ({ repo, now }, rawFilters) => {
  const [meta, agencies] = await Promise.all([repo.getDatasetMeta(), repo.listAgencies()]);
  const { asOf } = meta;
  const { filters, agency } = resolveFilters(rawFilters, agencies);
  const scope = buildScope(filters, agency);

  const trend = trendRange(asOf, filters.granularity);
  const previousTrend = previousRange(trend);
  const kpi = kpiPeriods(asOf);

  // A single window covering every range on the page, capped at the as-of time; never unbounded (AC-SEC-2).
  const from = Math.min(previousTrend.from, kpi.today.previous.from, kpi.thisWeek.previous.from, kpi.thisMonth.previous.from);
  const to = asOf + 1;
  const listings = await repo.listListingTimes({ from, to });

  const agencyState = new Map(agencies.map((a) => [a.id, a.state]));
  const scoped = listings.filter(scopePredicate(scope, agencyState)).map((l) => l.listedDate);

  const stateScopeAgencies = agenciesInState(agencies, filters.state);
  const ranked = rankAgencies(listings, stateScopeAgencies, trend, previousTrend, agency?.id ?? null);

  return {
    filters,
    scope,
    asOf,
    isStale: isStale(now, asOf),
    agencyOptions: stateScopeAgencies,
    kpis: {
      today: periodCount(scoped, kpi.today),
      thisWeek: periodCount(scoped, kpi.thisWeek),
      thisMonth: periodCount(scoped, kpi.thisMonth),
      agencyCount: agency ? 1 : stateScopeAgencies.length,
      stateCount: agency || filters.state ? 1 : STATE_CODES.length,
    },
    trend: { granularity: filters.granularity, points: countByBucket(scoped, trend, asOf) },
    byState: stateRows(listings, agencies, trend),
    topAgencies: { rows: topAgencyRows(ranked.rows), scopeTotal: ranked.scopeTotal },
  };
};

/** Runtime entry point for the page: the real repository and the server clock passed in by the caller. */
export function loadRentalAnalytics(filters: AnalyticsFilters, now: number): Promise<RentalAnalyticsView> {
  return getRentalAnalytics({ repo: getListingRepository(), now }, filters);
}
