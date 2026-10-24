import type { ListingRepository } from "@/data/repository.types";
import type { Granularity } from "@/utils/granularity";
import type { AnalyticsFilters, FilterKey } from "@/utils/search-params";
import type { StateCode } from "@/utils/states";

/** Validated filters, as parsed from the URL at the page boundary. Defined in utils so the parser owns it. */
export type { AnalyticsFilters };

export type AgencyOption = { id: number; name: string; state: StateCode };

export type Scope = {
  /** "All states and territories", the state's full name, or the agency name. */
  label: string;
  /** Trend series name: "All Rayblue agencies", the state name, or the agency name. */
  seriesName: string;
  state: StateCode | null;
  agency: AgencyOption | null;
};

/** A count for a period that may still be running, with its comparison period. */
export type PeriodCount = {
  current: number;
  /** Comparison count (same weekday last week, previous full week, or previous full month). */
  previous: number;
  /** Start of the comparison period, UTC ms; lets the UI say "last Saturday" or "September". */
  previousStart: number;
};

export type TrendPoint = {
  /** Bucket start, UTC ms (Sydney midnight / Monday / 1st). */
  start: number;
  count: number;
  /** True for the last bucket when it contains the as-of time and is not yet complete. */
  isPartial: boolean;
};

export type StateRow = { state: StateCode; agencyCount: number; count: number };

export type AgencyRow = {
  agencyId: number;
  name: string;
  state: StateCode;
  count: number;
  /** count / scope total, 0..1 (0 when the total is 0). */
  share: number;
  previousCount: number;
  /** (count − previous) / previous; null when previous is 0. */
  change: number | null;
  isSelected: boolean;
};

export type RentalAnalyticsView = {
  /** Filters after cross-validation (an agency outside the state is dropped, AC-FLT-9). */
  filters: AnalyticsFilters;
  /** Requested filters the service dropped (`agencyId` when unknown or outside the state, AC-FLT-11). */
  droppedFilters: FilterKey[];
  scope: Scope;
  /** Dataset as-of time, UTC ms. */
  asOf: number;
  /** True when "now" is more than 24 hours past the as-of time (AC-HDR-2). */
  isStale: boolean;
  /** Agencies for the Agency select: in the selected state, or all; sorted by name. */
  agencyOptions: AgencyOption[];
  kpis: {
    today: PeriodCount;
    thisWeek: PeriodCount;
    thisMonth: PeriodCount;
    agencyCount: number;
    /** Number of states and territories the agencies tile refers to (8 for the group). */
    stateCount: number;
  };
  trend: { granularity: Granularity; points: TrendPoint[] };
  /** True when the scope has no listings in the trend range: shown as information, never as an error (AC-STE-2). */
  isEmpty: boolean;
  /** All eight states and territories, highest count first, over the trend range. */
  byState: StateRow[];
  topAgencies: {
    /** Top 8 in the state scope, plus the selected agency as a ninth row when outside it. */
    rows: AgencyRow[];
    scopeTotal: number;
  };
};

export type RentalAnalyticsDeps = {
  repo: ListingRepository;
  /** Injected server clock, UTC ms. Used only for the staleness check. */
  now: number;
};

export type GetRentalAnalytics = (
  deps: RentalAnalyticsDeps,
  filters: AnalyticsFilters,
) => Promise<RentalAnalyticsView>;

/**
 * What the page renders. Known data failures are values, not throws, so the page can pick
 * a tailored view: `unavailable` is transient (retry helps), `invalid` means the figures
 * failed a plausibility check and are withheld (safe abstain). Anything else still throws.
 */
export type RentalAnalyticsResult =
  | { kind: "ok"; view: RentalAnalyticsView }
  | { kind: "unavailable" }
  | { kind: "invalid" };
