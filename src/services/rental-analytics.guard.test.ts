import fc from "fast-check";
import { DEFAULT_AS_OF as AS_OF } from "@/data/seed-config";
import { HOUR } from "@/test/arbitraries";
import { createTestDatabase } from "@/test/db";
import { DataIntegrityError } from "@/utils/errors";
import { DEFAULT_FILTERS } from "@/utils/search-params";
import { getRentalAnalytics } from "@/services/rental-analytics";
import { assertPlausibleView, MAX_CLOCK_SKEW_MS } from "@/services/rental-analytics.guard";
import type { RentalAnalyticsView } from "@/services/rental-analytics.types";

const plausible = (view: RentalAnalyticsView, now = AS_OF) => () => assertPlausibleView(view, now);

// A real view from the service over a small in-memory dataset; mutations break one invariant each.
let base: RentalAnalyticsView;
beforeAll(async () => {
  const d = createTestDatabase({
    agencies: [{ state: "NSW" }, { state: "VIC" }],
    listings: [1, 2, 30, 200].map((h, i) => ({ agencyId: (i % 2) + 1, listedDate: AS_OF - h * HOUR })),
  });
  base = await getRentalAnalytics({ repo: d.repo, now: AS_OF }, DEFAULT_FILTERS);
  d.close();
});
const makeView = (overrides: Partial<RentalAnalyticsView> = {}): RentalAnalyticsView => ({ ...base, ...overrides });

describe("assertPlausibleView (AC-STE-7)", () => {
  it("accepts a well-formed view, up to the allowed clock skew", () => {
    expect(plausible(makeView())).not.toThrow();
    expect(plausible(makeView(), AS_OF - MAX_CLOCK_SKEW_MS)).not.toThrow();
    expect(plausible(makeView(), AS_OF - MAX_CLOCK_SKEW_MS - 1)).toThrow(DataIntegrityError);
  });

  const mutations: Record<string, () => RentalAnalyticsView> = {
    "non-finite as-of": () => makeView({ asOf: Number.NaN }),
    "negative KPI": () => makeView({ kpis: { ...base.kpis, today: { ...base.kpis.today, current: -1 } } }),
    "fractional trend count": () => makeView({
      trend: { ...base.trend, points: base.trend.points.map((p, i) => (i === 3 ? { ...p, count: 1.5 } : p)) },
    }),
    "missing bucket": () => makeView({ trend: { ...base.trend, points: base.trend.points.slice(1) } }),
    "unordered buckets": () => makeView({ trend: { ...base.trend, points: [...base.trend.points].reverse() } }),
    "missing state": () => makeView({ byState: base.byState.slice(1) }),
    "duplicated state": () => makeView({ byState: [...base.byState.slice(1), base.byState[1]] }),
    "share above 1": () => makeView({
      topAgencies: { ...base.topAgencies, rows: base.topAgencies.rows.map((r, i) => (i === 0 ? { ...r, share: 1.2 } : r)) },
    }),
  };

  it.each(Object.entries(mutations))("rejects a view with a %s, naming no values", (_, mutate) => {
    const view = mutate();
    expect(plausible(view)).toThrow(DataIntegrityError);
    try {
      assertPlausibleView(view, AS_OF);
    } catch (error) {
      expect((error as Error).message).not.toMatch(/\d{3,}/);
    }
  });

  it("rejects any negative count, wherever it is", () => {
    fc.assert(
      fc.property(fc.nat({ max: base.trend.points.length - 1 }), fc.integer({ min: -1_000_000, max: -1 }), (i, count) => {
        const points = base.trend.points.map((p, j) => (j === i ? { ...p, count } : p));
        expect(plausible(makeView({ trend: { ...base.trend, points } }))).toThrow(DataIntegrityError);
      }),
    );
  });
});
