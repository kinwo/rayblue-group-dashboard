// The single home for Australia/Sydney time arithmetic (AGENTS.md rule 3).
// Every input and output is UTC epoch ms; "now" / as-of is always passed in.
import { tz, TZDate } from "@date-fns/tz";
import { addDays, addMonths, addWeeks, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { Granularity } from "@/utils/granularity";

export const TIME_ZONE = "Australia/Sydney";

const inSydney = { in: tz(TIME_ZONE) } as const;

/** Number of buckets in the trend chart for each granularity (intent F4). */
export const TREND_BUCKET_COUNT: Record<Granularity, number> = {
  daily: 14,
  weekly: 12,
  monthly: 12,
};

/** Half-open UTC range [from, to). */
export type TimeRange = { from: number; to: number };

/** A run of consecutive buckets. `starts[i]` is bucket i's start; bucket i ends at `starts[i + 1]` (or `to`). */
export type BucketRange = TimeRange & { granularity: Granularity; starts: number[] };

export type BucketCount = { start: number; count: number; isPartial: boolean };

/** Sydney midnight of the day containing `ms`. */
export function startOfSydneyDay(ms: number): number {
  return startOfDay(ms, inSydney).getTime();
}

/** Sydney midnight of the Monday of the week containing `ms`. */
export function startOfSydneyWeek(ms: number): number {
  return startOfWeek(ms, { ...inSydney, weekStartsOn: 1 }).getTime();
}

/** Sydney midnight of the 1st of the month containing `ms`. */
export function startOfSydneyMonth(ms: number): number {
  return startOfMonth(ms, inSydney).getTime();
}

/** Start of the bucket that contains `ms`; also its bucket key. */
export function bucketStart(ms: number, granularity: Granularity): number {
  switch (granularity) {
    case "daily":
      return startOfSydneyDay(ms);
    case "weekly":
      return startOfSydneyWeek(ms);
    case "monthly":
      return startOfSydneyMonth(ms);
  }
}

/** Moves a bucket start by `n` whole buckets in Sydney calendar time (DST-safe). */
export function addBuckets(start: number, granularity: Granularity, n: number): number {
  switch (granularity) {
    case "daily":
      return addDays(start, n, inSydney).getTime();
    case "weekly":
      return addWeeks(start, n, inSydney).getTime();
    case "monthly":
      return addMonths(start, n, inSydney).getTime();
  }
}

/** Shifts a timestamp by whole Sydney calendar days, keeping the wall-clock time. */
export function addSydneyDays(ms: number, n: number): number {
  return addDays(ms, n, inSydney).getTime();
}

/** Day of the week in Sydney: 0 = Sunday … 6 = Saturday. */
export function sydneyWeekday(ms: number): number {
  return new TZDate(ms, TIME_ZONE).getDay();
}

/** `count` consecutive buckets starting at the bucket containing `firstStart`. */
export function bucketRange(firstStart: number, granularity: Granularity, count: number): BucketRange {
  const first = bucketStart(firstStart, granularity);
  const starts = Array.from({ length: count }, (_, i) => addBuckets(first, granularity, i));
  return { granularity, starts, from: first, to: addBuckets(first, granularity, count) };
}

/** The trend chart range for a granularity, ending with the bucket that contains `asOf` (AC-TRD-1). */
export function trendRange(asOf: number, granularity: Granularity): BucketRange {
  const count = TREND_BUCKET_COUNT[granularity];
  const last = bucketStart(asOf, granularity);
  return bucketRange(addBuckets(last, granularity, -(count - 1)), granularity, count);
}

/** The range of equal length immediately before `range` (AC-AGY-3). */
export function previousRange(range: BucketRange): BucketRange {
  const count = range.starts.length;
  return bucketRange(addBuckets(range.from, range.granularity, -count), range.granularity, count);
}

/** Index of the bucket containing `ms`, or -1 when outside the range. `starts` is ascending. */
export function bucketIndex(range: BucketRange, ms: number): number {
  if (ms < range.from || ms >= range.to) return -1;
  let lo = 0;
  let hi = range.starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (range.starts[mid] <= ms) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Counts timestamps into every bucket of `range`, zero-filled and in order (AC-TRD-3).
 * Timestamps outside the range are ignored. The last bucket is partial when `asOf`
 * falls inside it before its final millisecond.
 */
export function countByBucket(timestamps: Iterable<number>, range: BucketRange, asOf: number): BucketCount[] {
  const counts = new Array<number>(range.starts.length).fill(0);
  for (const t of timestamps) {
    const i = bucketIndex(range, t);
    if (i >= 0) counts[i] += 1;
  }
  const lastIndex = range.starts.length - 1;
  return range.starts.map((start, i) => ({
    start,
    count: counts[i],
    isPartial: i === lastIndex && asOf >= start && asOf + 1 < range.to,
  }));
}

/** Counts timestamps in a half-open range. */
export function countInRange(timestamps: Iterable<number>, range: TimeRange): number {
  let n = 0;
  for (const t of timestamps) if (t >= range.from && t < range.to) n += 1;
  return n;
}

export type KpiPeriod = {
  /** From the period start up to and including `asOf`. */
  current: TimeRange;
  /** The comparison period, always complete (intent F3). */
  previous: TimeRange;
};

/**
 * KPI periods (intent F3): today vs the same weekday last week (full day);
 * week to date vs the previous full week; month to date vs the previous full month.
 */
export function kpiPeriods(asOf: number): { today: KpiPeriod; thisWeek: KpiPeriod; thisMonth: KpiPeriod } {
  const toDate = (granularity: Granularity, previousFrom: (start: number) => number): KpiPeriod => {
    const start = bucketStart(asOf, granularity);
    const from = previousFrom(start);
    return {
      current: { from: start, to: asOf + 1 },
      previous: { from, to: addBuckets(from, granularity, 1) },
    };
  };
  return {
    today: toDate("daily", (start) => addSydneyDays(start, -7)),
    thisWeek: toDate("weekly", (start) => addBuckets(start, "weekly", -1)),
    thisMonth: toDate("monthly", (start) => addBuckets(start, "monthly", -1)),
  };
}
