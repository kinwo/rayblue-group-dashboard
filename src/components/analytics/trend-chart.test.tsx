import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fc from "fast-check";

import { niceYTicks, tickStarts, TrendChart, TrendTooltip, trendSummary } from "@/components/analytics/trend-chart";
import styles from "@/components/analytics/trend-chart.module.css";
import { installChartLayout, installDomPolyfills } from "@/components/testing/dom";
import { dailyPoints, makeView } from "@/components/testing/fixtures";
import type { TrendPoint } from "@/services/rental-analytics.types";

beforeAll(() => {
  installDomPolyfills();
  installChartLayout();
});

const view = makeView();

describe("TrendChart", () => {
  it("AC-TRD-4: title, description with range and scope, series named for the scope", () => {
    render(<TrendChart trend={view.trend} scope={view.scope} />);
    const card = screen.getByRole("region", { name: "New listings per day" });
    expect(within(card).getByText("11 Oct to 24 Oct · All states and territories")).toBeInTheDocument();
    expect(within(card).getAllByText("All Rayblue agencies").length).toBeGreaterThan(0);
  });

  it("AC-TRD-4: weekly and monthly titles", () => {
    const { rerender } = render(<TrendChart trend={{ ...view.trend, granularity: "weekly" }} scope={view.scope} />);
    expect(screen.getByRole("region", { name: "New listings per week" })).toBeInTheDocument();
    rerender(<TrendChart trend={{ ...view.trend, granularity: "monthly" }} scope={view.scope} />);
    expect(screen.getByRole("region", { name: "New listings per month" })).toBeInTheDocument();
  });

  it("AC-TRD-6: role=img with a summary of scope, range, latest and peak", () => {
    render(<TrendChart trend={view.trend} scope={view.scope} />);
    expect(
      screen.getByRole("img", {
        name: "New listings per day for All states and territories, 11 Oct to 24 Oct. Latest 258, peak 621.",
      }),
    ).toBeInTheDocument();
  });

  it("AC-TRD-6, AC-TRD-2: the same figures are in a table, partial bucket marked (to date)", () => {
    render(<TrendChart trend={view.trend} scope={view.scope} />);
    const table = screen.getByRole("table", { name: "New listings per day, All states and territories" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(14);
    expect(rows[0]).toHaveTextContent("Sun 11 Oct 2026400");
    expect(rows[13]).toHaveTextContent("Sat 24 Oct 2026 (to date)258");
  });

  it("AC-TRD-5: the chart surface is keyboard focusable", () => {
    const { container } = render(<TrendChart trend={view.trend} scope={view.scope} />);
    const surface = container.querySelector(".recharts-surface");
    expect(surface).toHaveAttribute("tabindex", "0");
  });

  it("AC-TRD-5: keyboard focus on the chart shows a point's tooltip", async () => {
    const { container } = render(<TrendChart trend={view.trend} scope={view.scope} />);
    await userEvent.tab();
    expect(container.querySelector(".recharts-surface")).toHaveFocus();
    await userEvent.keyboard("{ArrowLeft}");
    const tooltip = container.querySelector<HTMLElement>(".recharts-tooltip-wrapper")!;
    expect(await within(tooltip).findByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat) \d+ Oct 2026/)).toBeInTheDocument();
    expect(within(tooltip).getByText("All Rayblue agencies")).toBeInTheDocument();
  });

  it("AC-STE-2: a zero series renders a flat line summary, not an error", () => {
    const trend = { granularity: "daily" as const, points: dailyPoints(new Array(14).fill(0)) };
    render(<TrendChart trend={trend} scope={view.scope} />);
    expect(screen.getByRole("img", { name: /Latest 0, peak 0\.$/ })).toBeInTheDocument();
  });
});

describe("TrendTooltip", () => {
  const point = (p: TrendPoint) => [{ payload: p }] as never;

  it("AC-TRD-5: long date, series name and tabular value", () => {
    const p = view.trend.points[0];
    render(<TrendTooltip active payload={point(p)} granularity="daily" seriesName="All Rayblue agencies" />);
    expect(screen.getByText("Sun 11 Oct 2026")).toBeInTheDocument();
    expect(screen.getByText("All Rayblue agencies")).toBeInTheDocument();
    expect(screen.getByText("400")).toHaveClass(styles.tooltipValue);
  });

  it("AC-TRD-2: the partial last bucket ends with (to date)", () => {
    const p = view.trend.points[13];
    render(<TrendTooltip active payload={point(p)} granularity="daily" seriesName="All Rayblue agencies" />);
    expect(screen.getByText("Sat 24 Oct 2026 (to date)")).toBeInTheDocument();
  });

  it("renders nothing when inactive", () => {
    const { container } = render(<TrendTooltip active={false} granularity="daily" seriesName="x" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("tickStarts", () => {
  it("labels every second bucket counting back from the latest", () => {
    fc.assert(
      fc.property(fc.array(fc.nat(1000), { minLength: 1, maxLength: 14 }), (counts) => {
        const points = dailyPoints(counts);
        const ticks = tickStarts(points);
        expect(ticks.at(-1)).toBe(points.at(-1)!.start);
        expect(ticks).toHaveLength(Math.ceil(points.length / 2));
        ticks.forEach((start) => {
          const fromEnd = points.length - 1 - points.findIndex((p) => p.start === start);
          expect(fromEnd % 2).toBe(0);
        });
      }),
    );
  });
});

describe("niceYTicks", () => {
  it("gives five evenly spaced whole-number ticks from 0 that cover the max", () => {
    fc.assert(
      fc.property(fc.nat(1_000_000), (max) => {
        const ticks = niceYTicks(max);
        expect(ticks).toHaveLength(5);
        expect(ticks[0]).toBe(0);
        expect(ticks.every(Number.isInteger)).toBe(true);
        expect(ticks[4]).toBeGreaterThanOrEqual(max);
        const step = ticks[1];
        ticks.forEach((t, i) => expect(t).toBe(i * step));
        // Never more than double the needed headroom.
        expect(ticks[4]).toBeLessThanOrEqual(Math.max(4, 2 * max));
      }),
    );
  });

  it("rounds to readable steps", () => {
    expect(niceYTicks(621)).toEqual([0, 200, 400, 600, 800]);
    expect(niceYTicks(260)).toEqual([0, 75, 150, 225, 300]);
    expect(niceYTicks(0)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("trendSummary", () => {
  it("states the scope even with no points", () => {
    expect(trendSummary({ trend: { granularity: "daily", points: [] }, scope: view.scope })).toBe(
      "New listings per day for All states and territories, .",
    );
  });
});
