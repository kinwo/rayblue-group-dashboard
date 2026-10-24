import fc from "fast-check";
import { arbGranularity, arbInstant } from "@/test/arbitraries";
import { bucketStart } from "@/utils/date-buckets";
import {
  formatAgencyCount,
  formatBucketLabel,
  formatBucketRange,
  formatBucketTooltip,
  formatChange,
  formatCount,
  formatDate,
  formatMonth,
  formatShare,
  formatTime,
  formatWeekday,
} from "@/utils/format";

const utc = (iso: string) => Date.parse(iso);
const AS_OF = utc("2026-10-23T22:00:00Z"); // 9:00 am Sat 24 Oct 2026, Sydney

describe("formatCount (AC-KPI-4)", () => {
  it.each([
    [0, "0"],
    [241, "241"],
    [3369, "3,369"],
    [1234567, "1,234,567"],
  ])("%d -> %s", (n, s) => expect(formatCount(n)).toBe(s));
});

describe("formatShare (AC-AGY-2)", () => {
  it.each([
    [0, "0.0%"],
    [0.123, "12.3%"],
    [0.12345, "12.3%"],
    [1, "100.0%"],
  ])("%d -> %s", (n, s) => expect(formatShare(n)).toBe(s));
});

describe("formatChange (AC-AGY-3)", () => {
  it.each<[number | null, string]>([
    [0.04, "+4%"],
    [-0.03, "−3%"],
    [0, "0%"],
    [0.004, "0%"],
    [-0.004, "0%"],
    [12.5, "+1,250%"],
    [null, "—"],
  ])("%p -> %s", (n, s) => expect(formatChange(n)).toBe(s));

  it("never uses a hyphen-minus", () => {
    fc.assert(fc.property(fc.double({ min: -1, max: 100, noNaN: true }), (c) => expect(formatChange(c)).not.toContain("-")));
  });
});

describe("Sydney dates", () => {
  it("formats the as-of time and date (AC-HDR-1)", () => {
    expect(formatTime(AS_OF)).toBe("9:00 am");
    expect(formatTime(utc("2026-10-24T04:05:00Z"))).toBe("3:05 pm");
    expect(formatTime(utc("2026-10-23T13:00:00Z"))).toBe("12:00 am");
    expect(formatDate(AS_OF)).toBe("24 Oct 2026");
  });

  it("formats weekday and month names", () => {
    expect(formatWeekday(AS_OF)).toBe("Saturday");
    expect(formatMonth(utc("2026-09-10T00:00:00Z"))).toBe("September");
  });

  it("uses the Sydney date, not the UTC date", () => {
    expect(formatDate(utc("2026-12-31T13:30:00Z"))).toBe("1 Jan 2027");
  });

  it("never abbreviates September as Sept", () => {
    expect(formatDate(utc("2026-09-10T00:00:00Z"))).toBe("10 Sep 2026");
  });

  it("time strings use plain spaces and lower-case am/pm", () => {
    fc.assert(fc.property(arbInstant, (t) => expect(formatTime(t)).toMatch(/^(1[0-2]|[1-9]):[0-5]\d (am|pm)$/)));
  });
});

describe("bucket labels (F4)", () => {
  const day = utc("2026-10-23T13:00:00Z"); // Sat 24 Oct
  const week = utc("2026-10-18T13:00:00Z"); // Mon 19 Oct
  const month = utc("2026-09-30T14:00:00Z"); // 1 Oct

  it("short labels", () => {
    expect(formatBucketLabel(day, "daily")).toBe("24 Oct");
    expect(formatBucketLabel(week, "weekly")).toBe("19 Oct");
    expect(formatBucketLabel(month, "monthly")).toBe("Oct");
  });

  it("long labels", () => {
    expect(formatBucketTooltip(day, "daily")).toBe("Sat 24 Oct 2026");
    expect(formatBucketTooltip(week, "weekly")).toBe("Week of 19 Oct 2026");
    expect(formatBucketTooltip(month, "monthly")).toBe("October 2026");
  });

  it("appends (to date) for a partial bucket (AC-TRD-2)", () => {
    expect(formatBucketTooltip(day, "daily", true)).toBe("Sat 24 Oct 2026 (to date)");
  });

  it("formats a range", () => {
    expect(formatBucketRange(utc("2026-10-10T13:00:00Z"), day, "daily")).toBe("11 Oct to 24 Oct");
  });

  it("every bucket start formats without throwing and the long label contains the year", () => {
    fc.assert(
      fc.property(arbInstant, arbGranularity, (t, g) => {
        const s = bucketStart(t, g);
        expect(formatBucketLabel(s, g).length).toBeGreaterThan(0);
        expect(formatBucketTooltip(s, g)).toMatch(/\d{4}$/);
      }),
    );
  });
});

describe("formatAgencyCount (AC-STA-2)", () => {
  it.each([
    [0, "0 agencies"],
    [1, "1 agency"],
    [58, "58 agencies"],
    [1200, "1,200 agencies"],
  ])("%d -> %s", (n, s) => expect(formatAgencyCount(n)).toBe(s));
});
