import fc from "fast-check";
import { arbGranularity, arbStateCode } from "@/test/arbitraries";
import { GRANULARITIES } from "@/utils/granularity";
import {
  type AnalyticsFilters,
  DEFAULT_FILTERS,
  parseAnalyticsSearchParams,
  type RawSearchParams,
  toQueryString,
  toSearchParams,
} from "@/utils/search-params";
import { isStateCode } from "@/utils/states";

const fromQuery = (query: string): RawSearchParams => {
  const out: RawSearchParams = {};
  for (const [k, v] of new URLSearchParams(query)) {
    const prev = out[k];
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
};

describe("parseAnalyticsSearchParams", () => {
  it("defaults to all states, all agencies and Daily (AC-FLT-1)", () => {
    expect(parseAnalyticsSearchParams({})).toEqual(DEFAULT_FILTERS);
    expect(parseAnalyticsSearchParams(undefined)).toEqual(DEFAULT_FILTERS);
  });

  it("accepts valid values", () => {
    expect(parseAnalyticsSearchParams({ state: "VIC", agencyId: "42", granularity: "monthly" })).toEqual({
      state: "VIC",
      agencyId: 42,
      granularity: "monthly",
    });
  });

  it.each<[string, RawSearchParams]>([
    ["unknown state", { state: "XYZ" }],
    ["lower-case state", { state: "nsw" }],
    ["unknown granularity", { granularity: "hourly" }],
    ["non-numeric agencyId", { agencyId: "abc" }],
    ["zero agencyId", { agencyId: "0" }],
    ["negative agencyId", { agencyId: "-3" }],
    ["fractional agencyId", { agencyId: "1.5" }],
    ["exponent agencyId", { agencyId: "1e3" }],
    ["padded agencyId", { agencyId: " 7" }],
    ["leading-zero agencyId", { agencyId: "07" }],
    ["huge agencyId", { agencyId: "99999999999999999999" }],
    ["10,000-character state", { state: "N".repeat(10_000) }],
    ["10,000-character agencyId", { agencyId: "1".repeat(10_000) }],
    ["array values", { state: ["NSW", "VIC"], agencyId: ["1", "2"], granularity: ["weekly"] }],
    ["empty strings", { state: "", agencyId: "", granularity: "" }],
    ["prototype keys", { __proto__: "x", constructor: "y", toString: "z" } as RawSearchParams],
  ])("falls back to defaults for %s (AC-FLT-8)", (_, raw) => {
    expect(parseAnalyticsSearchParams(raw)).toEqual(DEFAULT_FILTERS);
  });

  it("falls back per param independently", () => {
    expect(parseAnalyticsSearchParams({ state: "QLD", agencyId: "abc", granularity: "hourly" })).toEqual({
      ...DEFAULT_FILTERS,
      state: "QLD",
    });
    expect(parseAnalyticsSearchParams({ state: "XYZ", agencyId: "5", granularity: "weekly" })).toEqual({
      state: null,
      agencyId: 5,
      granularity: "weekly",
    });
  });

  it("never throws and always returns valid filters for arbitrary input (AC-SEC-2)", () => {
    const value = fc.oneof(fc.string({ maxLength: 40 }), fc.array(fc.string({ maxLength: 10 }), { maxLength: 3 }), fc.constant(undefined));
    const raw = fc.dictionary(fc.oneof(fc.constantFrom("state", "agencyId", "granularity"), fc.string({ maxLength: 10 })), value);
    fc.assert(
      fc.property(raw, (r) => {
        const f = parseAnalyticsSearchParams(r);
        expect(Object.keys(f).sort()).toEqual(["agencyId", "granularity", "state"]);
        expect(f.state === null || isStateCode(f.state)).toBe(true);
        expect(f.agencyId === null || (Number.isSafeInteger(f.agencyId) && f.agencyId > 0)).toBe(true);
        expect(GRANULARITIES).toContain(f.granularity);
      }),
    );
  });
});

const arbFilters: fc.Arbitrary<AnalyticsFilters> = fc.record({
  state: fc.option(arbStateCode, { nil: null }),
  agencyId: fc.option(fc.integer({ min: 1, max: 999_999_999 }), { nil: null }),
  granularity: arbGranularity,
});

describe("toSearchParams / toQueryString", () => {
  it("omits defaults", () => {
    expect(toQueryString(DEFAULT_FILTERS)).toBe("");
    expect(toQueryString({ ...DEFAULT_FILTERS, state: "NSW", granularity: "weekly" })).toBe("?state=NSW&granularity=weekly");
    expect(toSearchParams({ agencyId: 12 }).toString()).toBe("agencyId=12");
  });

  it("round-trips through the parser", () => {
    fc.assert(
      fc.property(arbFilters, (f) => {
        expect(parseAnalyticsSearchParams(fromQuery(toSearchParams(f).toString()))).toEqual(f);
      }),
    );
  });
});
