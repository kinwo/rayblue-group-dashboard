import type { Scope, TrendPoint } from "@/services/rental-analytics.types";
import { formatBucketRange } from "@/utils/format";
import type { Granularity } from "@/utils/granularity";

/** The state to highlight: the selected state, or the selected agency's state (AC-STA-3). */
export function highlightedState(scope: Scope) {
  return scope.state ?? scope.agency?.state ?? null;
}

/** "11 Oct to 24 Oct" for the trend range; every range-based card states it. */
export function trendRangeLabel(points: readonly TrendPoint[], granularity: Granularity): string {
  if (points.length === 0) return "";
  return formatBucketRange(points[0].start, points[points.length - 1].start, granularity);
}

/** Shown when a card's range has no listings: information, never an error (AC-STE-2). */
export function noListingsNote(label: string): string {
  return `No listings for ${label} in this period.`;
}

export const PERIOD_NOUN: Record<Granularity, string> = { daily: "day", weekly: "week", monthly: "month" };
