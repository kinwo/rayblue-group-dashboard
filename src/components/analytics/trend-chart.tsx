"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { AnalyticsCard } from "@/components/analytics/analytics-card";
import { PERIOD_NOUN, trendRangeLabel } from "@/components/analytics/scope";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import type { RentalAnalyticsView, TrendPoint } from "@/services/rental-analytics.types";
import { SINGLE_SERIES_COLOR } from "@/utils/chart-colors";
import { formatBucketLabel, formatBucketTooltip, formatCount } from "@/utils/format";
import type { Granularity } from "@/utils/granularity";

type TrendChartProps = Pick<RentalAnalyticsView, "trend" | "scope">;

/** Bucket starts to label: every second one counting back from the latest, so the latest is always labelled. */
export function tickStarts(points: readonly TrendPoint[]): number[] {
  const last = points.length - 1;
  return points.filter((_, i) => (last - i) % 2 === 0).map((p) => p.start);
}

const Y_INTERVALS = 4;

/** Five whole-number y ticks from 0 with a rounded step (e.g. 75, 200, 2,500) whose top covers `max`. */
export function niceYTicks(max: number): number[] {
  const raw = Math.max(max, 1) / Y_INTERVALS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const multiples = magnitude >= 10 ? [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10] : [1, 2, 3, 4, 5, 6, 8, 10];
  const step = Math.max(1, multiples.map((m) => m * magnitude).find((s) => s >= raw)!);
  return Array.from({ length: Y_INTERVALS + 1 }, (_, i) => i * step);
}

export function trendTitle(granularity: Granularity): string {
  return `New listings per ${PERIOD_NOUN[granularity]}`;
}

/** "New listings per day for All states and territories, 11 Oct to 24 Oct. Latest 258, peak 621." (AC-TRD-6) */
export function trendSummary({ trend, scope }: TrendChartProps): string {
  const { points, granularity } = trend;
  const head = `${trendTitle(granularity)} for ${scope.label}, ${trendRangeLabel(points, granularity)}.`;
  if (points.length === 0) return head;
  const latest = points[points.length - 1].count;
  const peak = Math.max(...points.map((p) => p.count));
  return `${head} Latest ${formatCount(latest)}, peak ${formatCount(peak)}.`;
}

const SERIES_KEY = "count";

/** Trend line card (F4, DESIGN.md §7). */
export function TrendChart({ trend, scope }: TrendChartProps) {
  const { points, granularity } = trend;
  const config: ChartConfig = { [SERIES_KEY]: { label: scope.seriesName } };
  const title = trendTitle(granularity);
  const yTicks = niceYTicks(Math.max(0, ...points.map((p) => p.count)));

  return (
    <AnalyticsCard
      title={title}
      description={`${trendRangeLabel(points, granularity)} · ${scope.label}`}
      aside={<Legend name={scope.seriesName} />}
    >
      <figure className="m-0">
        <div role="img" aria-label={trendSummary({ trend, scope })}>
          <ChartContainer
            config={config}
            className="aspect-auto h-60 w-full text-caption [&_.recharts-cartesian-axis-tick_text]:fill-ink-muted"
          >
            <LineChart data={points} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="var(--line)" />
              <XAxis
                dataKey="start"
                type="category"
                ticks={tickStarts(points)}
                tickFormatter={(start: number) => formatBucketLabel(start, granularity)}
                tickLine={false}
                axisLine={{ stroke: "var(--line-strong)" }}
                tickMargin={8}
                interval={0}
              />
              <YAxis
                ticks={yTicks}
                interval={0}
                tickFormatter={(n: number) => formatCount(n)}
                tickLine={false}
                axisLine={false}
                width={48}
                domain={[0, yTicks[yTicks.length - 1]]}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--line-strong)", strokeDasharray: "4 4" }}
                content={({ active, payload }) => (
                  <TrendTooltip active={active} payload={payload} granularity={granularity} seriesName={scope.seriesName} />
                )}
              />
              <Line
                dataKey={SERIES_KEY}
                name={scope.seriesName}
                type="linear"
                stroke={SINGLE_SERIES_COLOR}
                strokeWidth={2}
                dot={{ r: 3.5, fill: SINGLE_SERIES_COLOR, stroke: "var(--surface-raised)", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: SINGLE_SERIES_COLOR, stroke: "var(--surface-raised)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
        <table className="sr-only">
          <caption>
            {title}, {scope.label}
          </caption>
          <thead>
            <tr>
              <th scope="col">Period</th>
              <th scope="col">New listings</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.start}>
                <th scope="row">{formatBucketTooltip(p.start, granularity, p.isPartial)}</th>
                <td>{formatCount(p.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </AnalyticsCard>
  );
}

function Legend({ name }: { name: string }) {
  return (
    <div aria-hidden="true" className="flex items-center gap-2 text-caption text-ink-muted">
      <span className="size-2.5 rounded-sm" style={{ backgroundColor: SINGLE_SERIES_COLOR }} />
      {name}
    </div>
  );
}

type TrendTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  granularity: Granularity;
  seriesName: string;
};

/** Tooltip card: long date (with "(to date)" on a partial bucket), swatch, series name, bold value. */
export function TrendTooltip({ active, payload, granularity, seriesName }: TrendTooltipProps) {
  const point = payload?.[0]?.payload as TrendPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="min-w-[140px] rounded-md border border-line bg-surface-raised px-3 py-2 text-ink shadow-md">
      <p className="text-caption-strong">{formatBucketTooltip(point.start, granularity, point.isPartial)}</p>
      <p className="mt-1 flex items-center gap-2 text-caption">
        <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ backgroundColor: SINGLE_SERIES_COLOR }} />
        <span className="text-ink-muted">{seriesName}</span>
        <span className="ml-auto font-semibold tabular-nums">{formatCount(point.count)}</span>
      </p>
    </div>
  );
}
