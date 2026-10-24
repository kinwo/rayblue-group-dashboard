// Shared fast-check generators (ENGINEERING.md › Property-based tests). Keep them here, not in test files.
import { TZDate } from "@date-fns/tz";
import fc from "fast-check";
import { TIME_ZONE } from "@/utils/date-buckets";
import { GRANULARITIES } from "@/utils/granularity";
import { STATE_CODES } from "@/utils/states";

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

const FIRST_YEAR = 2020;
const LAST_YEAR = 2030;

function firstSunday(year: number, month: number): number {
  for (let day = 1; day <= 7; day++) {
    const d = new TZDate(year, month, day, TIME_ZONE);
    if (d.getDay() === 0) return d.getTime();
  }
  throw new Error("unreachable");
}

/** Sydney DST changes (first Sunday of April and October) and month/year ends, 2020–2030. */
export const INTERESTING_INSTANTS: readonly number[] = (() => {
  const out: number[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    out.push(firstSunday(y, 3) + 3 * HOUR, firstSunday(y, 9) + 2 * HOUR);
    for (let m = 0; m < 12; m++) out.push(new TZDate(y, m, 1, TIME_ZONE).getTime());
  }
  return out;
})();

const uniformInstant = fc.integer({
  min: new TZDate(FIRST_YEAR, 1, 1, TIME_ZONE).getTime(),
  max: new TZDate(LAST_YEAR, 10, 1, TIME_ZONE).getTime(),
});

const nearInteresting = fc
  .tuple(fc.constantFrom(...INTERESTING_INSTANTS), fc.integer({ min: -3 * DAY, max: 3 * DAY }))
  .map(([anchor, offset]) => anchor + offset);

/** A UTC instant, biased towards DST changes and month/year ends. */
export const arbInstant: fc.Arbitrary<number> = fc.oneof(uniformInstant, nearInteresting);

/** An as-of time; same distribution as `arbInstant`. */
export const arbAsOf = arbInstant;

export const arbGranularity = fc.constantFrom(...GRANULARITIES);

export const arbStateCode = fc.constantFrom(...STATE_CODES);

/** Timestamps within `spanMs` before `asOf` (inclusive of asOf), plus a few just outside either side. */
export function arbTimestampsBefore(asOf: number, spanMs: number, maxLength = 200): fc.Arbitrary<number[]> {
  return fc.array(fc.integer({ min: asOf - spanMs - DAY, max: asOf + DAY }), { maxLength });
}

/** An as-of time with listing timestamps covering the 2 years before it (enough for any trend + previous range). */
export const arbAsOfWithTimestamps: fc.Arbitrary<{ asOf: number; timestamps: number[] }> = arbAsOf.chain((asOf) =>
  arbTimestampsBefore(asOf, 2 * 366 * DAY).map((timestamps) => ({ asOf, timestamps })),
);

export type GeneratedAgency = { id: number; name: string; state: (typeof STATE_CODES)[number]; suburb: string };
export type GeneratedListing = { agencyId: number; listedDate: number };

/** A small world of agencies and listings ending at `asOf`, for aggregation properties. */
export const arbDataset: fc.Arbitrary<{
  asOf: number;
  agencies: GeneratedAgency[];
  listings: GeneratedListing[];
}> = fc
  .tuple(arbAsOf, fc.array(fc.tuple(arbStateCode, fc.string({ minLength: 1, maxLength: 6 })), { minLength: 0, maxLength: 12 }))
  .chain(([asOf, specs]) => {
    const agencies = specs.map(([state, suffix], i) => ({
      id: i + 1,
      name: `Agency ${suffix} ${i + 1}`,
      state,
      suburb: "Suburb",
    }));
    const listing =
      agencies.length === 0
        ? fc.constant<GeneratedListing[]>([])
        : fc.array(
            fc.record({
              agencyId: fc.integer({ min: 1, max: agencies.length }),
              listedDate: fc.integer({ min: asOf - 800 * DAY, max: asOf }),
            }),
            { maxLength: 300 },
          );
    return listing.map((listings) => ({ asOf, agencies, listings }));
  });
