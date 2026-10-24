// Rental analytics use case: one bounded read of listing times, aggregated in memory.
import { getListingRepository } from "@/data/listing-repository";
import { countByBucket, kpiPeriods, previousRange, trendRange } from "@/utils/date-buckets";
import { DataIntegrityError, DataUnavailableError } from "@/utils/errors";
import { logger } from "@/utils/logger";
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
import { assertPlausibleView } from "@/services/rental-analytics.guard";
import type { GetRentalAnalytics, RentalAnalyticsResult, RentalAnalyticsView } from "@/services/rental-analytics.types";

/**
 * Builds the whole view for `filters`. Repository errors (`DataUnavailableError`,
 * `DataIntegrityError`) propagate unchanged; a dataset with no agencies or a view that
 * fails `assertPlausibleView` throws `DataIntegrityError`.
 */
export const getRentalAnalytics: GetRentalAnalytics = async ({ repo, now }, rawFilters) => {
  const [meta, agencies] = await Promise.all([repo.getDatasetMeta(), repo.listAgencies()]);
  const { asOf } = meta;
  // A group with no agencies is a broken release, not an empty period.
  if (agencies.length === 0) throw new DataIntegrityError("no agencies.");
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
  const points = countByBucket(scoped, trend, asOf);
  const ranked = rankAgencies(listings, stateScopeAgencies, trend, previousTrend, agency?.id ?? null);

  const view: RentalAnalyticsView = {
    filters,
    droppedFilters: rawFilters.agencyId !== null && filters.agencyId === null ? ["agencyId"] : [],
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
    trend: { granularity: filters.granularity, points },
    isEmpty: points.every((p) => p.count === 0),
    byState: stateRows(listings, agencies, trend),
    topAgencies: { rows: topAgencyRows(ranked.rows), scopeTotal: ranked.scopeTotal },
  };
  assertPlausibleView(view, now);
  return view;
};

/**
 * Runtime entry point for the page: the real repository and the server clock passed in by the caller.
 * Known data failures come back as a degraded result and are logged once without detail;
 * anything unexpected still throws to the route error boundary.
 */
export async function loadRentalAnalytics(filters: AnalyticsFilters, now: number): Promise<RentalAnalyticsResult> {
  try {
    return { kind: "ok", view: await getRentalAnalytics({ repo: getListingRepository(), now }, filters) };
  } catch (error) {
    if (error instanceof DataUnavailableError) {
      logger.warn("analytics_degraded", { reason: "data_unavailable", error });
      return { kind: "unavailable" };
    }
    if (error instanceof DataIntegrityError) {
      logger.error("analytics_degraded", { reason: "data_invalid", error });
      return { kind: "invalid" };
    }
    throw error;
  }
}
