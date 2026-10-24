// Plausibility guard for a built view (safe abstain): figures that break an invariant are
// withheld as a `DataIntegrityError` rather than shown as fact.
import { TREND_BUCKET_COUNT } from "@/utils/date-buckets";
import { DataIntegrityError } from "@/utils/errors";
import { STATE_CODES } from "@/utils/states";
import type { RentalAnalyticsView } from "@/services/rental-analytics.types";

/** How far the dataset as-of time may run ahead of the server clock before it is implausible. */
export const MAX_CLOCK_SKEW_MS = 60 * 60 * 1000;

const isCount = (n: number) => Number.isSafeInteger(n) && n >= 0;

/** Throws `DataIntegrityError` naming the first broken invariant. The message carries no values (AC-SEC-5). */
export function assertPlausibleView(view: RentalAnalyticsView, now: number): void {
  const fail = (detail: string): never => {
    throw new DataIntegrityError(detail);
  };

  if (!Number.isFinite(view.asOf)) fail("as-of time is not a number.");
  if (view.asOf > now + MAX_CLOCK_SKEW_MS) fail("as-of time is in the future.");

  const { kpis, trend, byState, topAgencies } = view;
  const counts = [
    kpis.agencyCount,
    kpis.stateCount,
    ...[kpis.today, kpis.thisWeek, kpis.thisMonth].flatMap((p) => [p.current, p.previous]),
    ...trend.points.map((p) => p.count),
    ...byState.flatMap((r) => [r.count, r.agencyCount]),
    ...topAgencies.rows.flatMap((r) => [r.count, r.previousCount]),
    topAgencies.scopeTotal,
  ];
  if (!counts.every(isCount)) fail("a count is negative or not a whole number.");

  const points = trend.points;
  if (points.length !== TREND_BUCKET_COUNT[trend.granularity]) fail("trend has the wrong number of buckets.");
  if (points.some((p, i) => i > 0 && p.start <= points[i - 1].start)) fail("trend buckets are out of order.");

  const states = new Set(byState.map((r) => r.state));
  if (byState.length !== STATE_CODES.length || STATE_CODES.some((s) => !states.has(s))) {
    fail("state totals do not cover every state once.");
  }

  if (topAgencies.rows.some((r) => !(r.share >= 0 && r.share <= 1))) fail("an agency share is outside 0..1.");
}
