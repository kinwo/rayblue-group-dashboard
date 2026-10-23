import fc from "fast-check";
import { arbAsOf, arbAsOfWithTimestamps, arbGranularity, arbInstant, DAY, HOUR } from "@/test/arbitraries";
import {
  addSydneyDays,
  bucketIndex,
  startOfSydneyDay,
  sydneyWeekday,
  bucketStart,
  countByBucket,
  countInRange,
  kpiPeriods,
  previousRange,
  TREND_BUCKET_COUNT,
  trendRange,
} from "@/utils/date-buckets";

// Independent oracle: Sydney wall-clock parts via Intl, not date-fns.
const parts = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});
function sydney(ms: number) {
  const p = Object.fromEntries(parts.formatToParts(ms).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    month: `${p.year}-${p.month}`,
    day: Number(p.day),
    time: `${p.hour}:${p.minute}:${p.second}`,
    weekday: p.weekday,
  };
}

const utc = (iso: string) => Date.parse(iso);

describe("bucketStart", () => {
  it("returns Sydney midnight for daily, Monday for weekly and the 1st for monthly", () => {
    fc.assert(
      fc.property(arbInstant, (t) => {
        const d = bucketStart(t, "daily");
        const w = bucketStart(t, "weekly");
        const m = bucketStart(t, "monthly");
        expect(sydney(d).date).toBe(sydney(t).date);
        expect(sydney(d).time).toBe("00:00:00");
        expect(sydney(w).weekday).toBe("Mon");
        expect(sydney(w).time).toBe("00:00:00");
        expect(t - w).toBeLessThan(7 * DAY + HOUR);
        expect(sydney(m).month).toBe(sydney(t).month);
        expect(sydney(m).day).toBe(1);
        expect(sydney(m).time).toBe("00:00:00");
        for (const s of [d, w, m]) expect(s).toBeLessThanOrEqual(t);
      }),
    );
  });

  it("is idempotent", () => {
    fc.assert(
      fc.property(arbInstant, arbGranularity, (t, g) => {
        const s = bucketStart(t, g);
        expect(bucketStart(s, g)).toBe(s);
      }),
    );
  });

  it("handles the DST start (first Sunday of October) as a 23-hour day", () => {
    // 4 Oct 2026: clocks go from 2:00 AEST to 3:00 AEDT.
    const start = bucketStart(utc("2026-10-04T05:00:00Z"), "daily");
    expect(start).toBe(utc("2026-10-03T14:00:00Z")); // 00:00 AEST
    expect(bucketStart(utc("2026-10-04T12:59:59.999Z"), "daily")).toBe(start);
    expect(bucketStart(utc("2026-10-04T13:00:00Z"), "daily")).toBe(utc("2026-10-04T13:00:00Z")); // 00:00 AEDT
  });

  it("handles the DST end (first Sunday of April) as a 25-hour day", () => {
    // 5 Apr 2026: clocks go from 3:00 AEDT back to 2:00 AEST.
    expect(bucketStart(utc("2026-04-05T12:00:00Z"), "daily")).toBe(utc("2026-04-04T13:00:00Z"));
    expect(bucketStart(utc("2026-04-05T13:59:59.999Z"), "daily")).toBe(utc("2026-04-04T13:00:00Z"));
    expect(bucketStart(utc("2026-04-05T14:00:00Z"), "daily")).toBe(utc("2026-04-05T14:00:00Z"));
  });

  it("puts a UTC-December instant that is already January in Sydney into January", () => {
    const t = utc("2026-12-31T13:30:00Z"); // 00:30 1 Jan 2027 AEDT
    expect(bucketStart(t, "monthly")).toBe(utc("2026-12-31T13:00:00Z"));
    expect(bucketStart(t, "daily")).toBe(utc("2026-12-31T13:00:00Z"));
  });
});

describe("sydneyWeekday / addSydneyDays", () => {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  it("agrees with the Sydney weekday and keeps wall-clock time across DST", () => {
    fc.assert(
      fc.property(arbInstant, fc.integer({ min: -400, max: 400 }), (t, n) => {
        expect(names[sydneyWeekday(t)]).toBe(sydney(t).weekday);
        const d = startOfSydneyDay(t);
        const shifted = addSydneyDays(d, n);
        expect(sydney(shifted).time).toBe("00:00:00");
        expect(sydneyWeekday(shifted)).toBe((((sydneyWeekday(d) + n) % 7) + 7) % 7);
      }),
    );
  });

  it("says 24 Oct 2026 is a Saturday", () => {
    expect(sydneyWeekday(utc("2026-10-23T22:00:00Z"))).toBe(6);
  });
});

describe("trendRange (AC-TRD-1)", () => {
  it("has the F4 number of contiguous buckets ending with the bucket containing asOf", () => {
    fc.assert(
      fc.property(arbAsOf, arbGranularity, (asOf, g) => {
        const r = trendRange(asOf, g);
        expect(r.starts).toHaveLength(TREND_BUCKET_COUNT[g]);
        expect(r.from).toBe(r.starts[0]);
        expect(r.starts.at(-1)).toBe(bucketStart(asOf, g));
        expect(asOf).toBeLessThan(r.to);
        // Continuity: each start is the bucket start of the previous end; strictly increasing.
        const ends = [...r.starts.slice(1), r.to];
        r.starts.forEach((s, i) => {
          expect(bucketStart(s, g)).toBe(s);
          expect(ends[i]).toBeGreaterThan(s);
          expect(bucketStart(ends[i] - 1, g)).toBe(s);
        });
      }),
    );
  });

  it("matches the 24 Oct 2026 as-of example", () => {
    const asOf = utc("2026-10-23T22:00:00Z"); // 9:00 am Sat 24 Oct 2026 AEDT
    const daily = trendRange(asOf, "daily");
    expect(sydney(daily.from).date).toBe("2026-10-11");
    expect(sydney(daily.starts.at(-1)!).date).toBe("2026-10-24");
    const weekly = trendRange(asOf, "weekly");
    expect(sydney(weekly.starts.at(-1)!).date).toBe("2026-10-19");
    expect(sydney(weekly.from).date).toBe("2026-08-03");
    const monthly = trendRange(asOf, "monthly");
    expect(sydney(monthly.from).date).toBe("2025-11-01");
    expect(sydney(monthly.starts.at(-1)!).date).toBe("2026-10-01");
  });
});

describe("previousRange", () => {
  it("has the same bucket count and ends where the range begins", () => {
    fc.assert(
      fc.property(arbAsOf, arbGranularity, (asOf, g) => {
        const r = trendRange(asOf, g);
        const p = previousRange(r);
        expect(p.starts).toHaveLength(r.starts.length);
        expect(p.to).toBe(r.from);
        expect(p.granularity).toBe(g);
      }),
    );
  });
});

describe("countByBucket (AC-DAT-1, AC-TRD-3)", () => {
  it("conserves listings: bucket counts sum to the number in range", () => {
    fc.assert(
      fc.property(arbAsOfWithTimestamps, arbGranularity, ({ asOf, timestamps }, g) => {
        const r = trendRange(asOf, g);
        const series = countByBucket(timestamps, r, asOf);
        const total = series.reduce((a, b) => a + b.count, 0);
        expect(total).toBe(countInRange(timestamps, r));
      }),
    );
  });

  it("places each listing in exactly one bucket, the one whose bounds contain it", () => {
    fc.assert(
      fc.property(arbAsOfWithTimestamps, arbGranularity, ({ asOf, timestamps }, g) => {
        const r = trendRange(asOf, g);
        const ends = [...r.starts.slice(1), r.to];
        for (const t of timestamps) {
          const containing = r.starts.filter((s, i) => t >= s && t < ends[i]);
          const i = bucketIndex(r, t);
          if (t >= r.from && t < r.to) {
            expect(containing).toHaveLength(1);
            expect(r.starts[i]).toBe(containing[0]);
            expect(r.starts[i]).toBe(bucketStart(t, g));
          } else {
            expect(containing).toHaveLength(0);
            expect(i).toBe(-1);
          }
        }
      }),
    );
  });

  it("is zero-filled and never skips a bucket", () => {
    fc.assert(
      fc.property(arbAsOf, arbGranularity, (asOf, g) => {
        const r = trendRange(asOf, g);
        const series = countByBucket([], r, asOf);
        expect(series.map((p) => p.start)).toEqual(r.starts);
        expect(series.every((p) => p.count === 0)).toBe(true);
      }),
    );
  });

  it("marks only the last bucket partial while asOf is inside it", () => {
    fc.assert(
      fc.property(arbAsOf, arbGranularity, (asOf, g) => {
        const r = trendRange(asOf, g);
        const series = countByBucket([], r, asOf);
        expect(series.slice(0, -1).every((p) => !p.isPartial)).toBe(true);
        expect(series.at(-1)!.isPartial).toBe(asOf + 1 < r.to);
      }),
    );
  });

  it("daily counts summed per week equal the weekly counts", () => {
    fc.assert(
      fc.property(arbAsOfWithTimestamps, ({ asOf, timestamps }) => {
        const weekly = trendRange(asOf, "weekly");
        const weeklyCounts = countByBucket(timestamps, weekly, asOf);
        // A daily range covering exactly the same span as the weekly range.
        const dayStarts: number[] = [];
        for (let s = weekly.from; s < weekly.to; s = bucketStart(s + 26 * HOUR, "daily")) dayStarts.push(s);
        const daily = { granularity: "daily" as const, starts: dayStarts, from: weekly.from, to: weekly.to };
        const dailyCounts = countByBucket(timestamps, daily, asOf);
        const summed = new Map<number, number>();
        for (const d of dailyCounts) {
          const w = bucketStart(d.start, "weekly");
          summed.set(w, (summed.get(w) ?? 0) + d.count);
        }
        expect(dayStarts).toHaveLength(84);
        for (const w of weeklyCounts) expect(summed.get(w.start)).toBe(w.count);
      }),
    );
  });
});

describe("kpiPeriods (F3)", () => {
  const asOf = utc("2026-10-23T22:00:00Z"); // 9:00 am Sat 24 Oct 2026

  it("compares today with the same weekday last week, full day", () => {
    const { today } = kpiPeriods(asOf);
    expect(today.current).toEqual({ from: utc("2026-10-23T13:00:00Z"), to: asOf + 1 });
    expect(today.previous).toEqual({ from: utc("2026-10-16T13:00:00Z"), to: utc("2026-10-17T13:00:00Z") });
  });

  it("compares the week to date with the previous full week", () => {
    const { thisWeek } = kpiPeriods(asOf);
    expect(thisWeek.current.from).toBe(utc("2026-10-18T13:00:00Z")); // Mon 19 Oct
    expect(thisWeek.previous).toEqual({ from: utc("2026-10-11T13:00:00Z"), to: utc("2026-10-18T13:00:00Z") });
  });

  it("compares the month to date with the previous full month, across the October DST change", () => {
    const { thisMonth } = kpiPeriods(asOf);
    expect(thisMonth.current.from).toBe(utc("2026-09-30T14:00:00Z")); // 1 Oct AEST
    expect(thisMonth.previous).toEqual({ from: utc("2026-08-31T14:00:00Z"), to: utc("2026-09-30T14:00:00Z") });
  });

  it("comparison periods are complete buckets that end on or before the current period starts", () => {
    fc.assert(
      fc.property(arbAsOf, (t) => {
        const k = kpiPeriods(t);
        for (const p of [k.today, k.thisWeek, k.thisMonth]) {
          expect(p.previous.to).toBeLessThanOrEqual(p.current.from);
          expect(p.current.from).toBeLessThanOrEqual(t);
          expect(p.current.to).toBe(t + 1);
        }
        expect(sydney(k.today.previous.from).weekday).toBe(sydney(t).weekday);
        expect(k.thisWeek.previous.to).toBe(k.thisWeek.current.from);
        expect(k.thisMonth.previous.to).toBe(k.thisMonth.current.from);
      }),
    );
  });
});
