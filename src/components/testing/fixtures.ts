import type { AgencyOption, RentalAnalyticsView, TrendPoint } from "@/services/rental-analytics.types";
import { STATE_CODES } from "@/utils/states";

// Test fixtures shaped like the service's output. Times are UTC ms.

/** 9:00 am Sat 24 Oct 2026 Australia/Sydney (AEDT, UTC+11). */
export const AS_OF = Date.UTC(2026, 9, 23, 22, 0);
const DAY = 24 * 60 * 60 * 1000;
/** Sydney midnight on 24 Oct 2026. */
const SYDNEY_MIDNIGHT_24_OCT = Date.UTC(2026, 9, 23, 13, 0);

export const AGENCIES: AgencyOption[] = [
  { id: 3, name: "Rayblue Parramatta", state: "NSW" },
  { id: 1, name: "Rayblue Bondi", state: "NSW" },
  { id: 7, name: "Rayblue Fitzroy", state: "VIC" },
  { id: 9, name: "Rayblue Brisbane City", state: "QLD" },
];

export const DAILY_COUNTS = [400, 512, 621, 380, 290, 300, 410, 450, 470, 520, 390, 280, 241, 258];

export function dailyPoints(counts: readonly number[] = DAILY_COUNTS): TrendPoint[] {
  return counts.map((count, i) => ({
    start: SYDNEY_MIDNIGHT_24_OCT - (counts.length - 1 - i) * DAY,
    count,
    isPartial: i === counts.length - 1,
  }));
}

export function makeView(overrides: Partial<RentalAnalyticsView> = {}): RentalAnalyticsView {
  return {
    filters: { state: null, agencyId: null, granularity: "daily" },
    scope: { label: "All states and territories", seriesName: "All Rayblue agencies", state: null, agency: null },
    asOf: AS_OF,
    isStale: false,
    agencyOptions: AGENCIES,
    kpis: {
      today: { current: 258, previous: 241, previousStart: SYDNEY_MIDNIGHT_24_OCT - 7 * DAY },
      thisWeek: { current: 1932, previous: 3369, previousStart: Date.UTC(2026, 9, 11, 13, 0) },
      thisMonth: { current: 11204, previous: 14210, previousStart: Date.UTC(2026, 7, 31, 14, 0) },
      agencyCount: 4,
      stateCount: 8,
    },
    trend: { granularity: "daily", points: dailyPoints() },
    byState: STATE_CODES.map((state, i) => ({
      state,
      agencyCount: [2, 1, 1, 0, 0, 0, 0, 0][i],
      count: [3000, 1500, 900, 0, 0, 0, 0, 0][i],
    })),
    topAgencies: {
      rows: [
        { agencyId: 3, name: "Rayblue Parramatta", state: "NSW", count: 1800, share: 0.3, previousCount: 1700, change: 1800 / 1700 - 1, isSelected: false },
        { agencyId: 7, name: "Rayblue Fitzroy", state: "VIC", count: 1500, share: 0.25, previousCount: 0, change: null, isSelected: false },
        { agencyId: 1, name: "Rayblue Bondi", state: "NSW", count: 1200, share: 0.2, previousCount: 1240, change: 1200 / 1240 - 1, isSelected: false },
        { agencyId: 9, name: "Rayblue Brisbane City", state: "QLD", count: 900, share: 0.15, previousCount: 900, change: 0, isSelected: false },
      ],
      scopeTotal: 5400,
    },
    ...overrides,
  };
}
