"use client";

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { useState } from "react";

import { AnalyticsCard } from "@/components/analytics/analytics-card";
import layout from "@/components/analytics/analytics-layout.module.css";
import { trendRangeLabel } from "@/components/analytics/scope";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AgencyRow, RentalAnalyticsView } from "@/services/rental-analytics.types";
import { cn } from "@/utils/cn";
import { formatChange, formatCount, formatShare } from "@/utils/format";
import { ALL_STATES_LABEL, stateName } from "@/utils/states";

import styles from "@/components/analytics/top-agencies-table.module.css";

type TopAgenciesTableProps = Pick<RentalAnalyticsView, "topAgencies" | "scope" | "trend">;

type SortKey = "name" | "state" | "count" | "share" | "change";
type SortDirection = "ascending" | "descending";
type Sort = { key: SortKey; direction: SortDirection };

const DEFAULT_SORT: Sort = { key: "count", direction: "descending" };

const compare: Record<SortKey, (a: AgencyRow, b: AgencyRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, "en-AU"),
  state: (a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name, "en-AU"),
  count: (a, b) => a.count - b.count,
  share: (a, b) => a.share - b.share,
  // "—" (no previous count) sorts below every number.
  change: (a, b) => (a.change ?? -Infinity) - (b.change ?? -Infinity),
};

/** The visible rows in the chosen order; ties keep the service's ranking. */
export function sortRows(rows: readonly AgencyRow[], sort: Sort): AgencyRow[] {
  const sign = sort.direction === "ascending" ? 1 : -1;
  return rows
    .map((row, rank) => ({ row, rank }))
    .sort((a, b) => sign * compare[sort.key](a.row, b.row) || a.rank - b.rank)
    .map(({ row }) => row);
}

export const TABLE_CAPTION = "Top agencies by new listings";
export const EMPTY_MESSAGE = "No agencies match these filters.";

/** Top agencies table (F6, DESIGN.md §6 › Data table). Sorting is local view state; filters stay in the URL. */
export function TopAgenciesTable({ topAgencies, scope, trend }: TopAgenciesTableProps) {
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
  const rows = sortRows(topAgencies.rows, sort);
  const shareLabel = scope.state ? `Share of ${scope.state}` : "Share of group";

  const toggle = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "ascending" ? "descending" : "ascending" }
        : { key, direction: key === "name" || key === "state" ? "ascending" : "descending" },
    );

  const header = (key: SortKey, label: string, numeric = false) => (
    <SortableHead key={key} label={label} numeric={numeric} sort={sort.key === key ? sort.direction : null} onSort={() => toggle(key)} />
  );

  return (
    <AnalyticsCard
      title="Top agencies"
      description={`${trendRangeLabel(trend.points, trend.granularity)} · ${scope.state ? stateName(scope.state) : ALL_STATES_LABEL}`}
      className={layout.tableColumn}
    >
      <div className={styles.frame}>
        <Table className={styles.table}>
          <TableCaption className="sr-only">{TABLE_CAPTION}</TableCaption>
          <TableHeader className={styles.head}>
            <TableRow className={styles.headRow}>
              {header("name", "Agency")}
              {header("state", "State")}
              {header("count", "New listings", true)}
              {header("share", shareLabel, true)}
              {header("change", "vs previous", true)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className={styles.emptyRow}>
                <TableCell colSpan={5} className={styles.empty}>
                  {EMPTY_MESSAGE}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.agencyId}
                  aria-selected={row.isSelected}
                  data-state={row.isSelected ? "selected" : undefined}
                  className={styles.row}
                >
                  <TableCell className={cn(styles.cell, styles.name)}>{row.name}</TableCell>
                  <TableCell className={cn(styles.cell, styles.state)}>{row.state}</TableCell>
                  <TableCell className={cn(styles.cell, styles.numeric)}>{formatCount(row.count)}</TableCell>
                  <TableCell className={cn(styles.cell, styles.numeric)}>{formatShare(row.share)}</TableCell>
                  <TableCell className={cn(styles.cell, styles.numeric)}>{formatChange(row.change)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </AnalyticsCard>
  );
}

function SortableHead({
  label,
  numeric,
  sort,
  onSort,
}: {
  label: string;
  numeric: boolean;
  sort: SortDirection | null;
  onSort: () => void;
}) {
  const Icon = sort === "ascending" ? ArrowUpIcon : sort === "descending" ? ArrowDownIcon : ArrowUpDownIcon;
  return (
    <TableHead aria-sort={sort ?? "none"} className={cn(styles.columnHead, numeric && styles.columnHeadNumeric)}>
      <button type="button" onClick={onSort} className={styles.sortButton}>
        <Icon aria-hidden="true" className={styles.sortIcon} data-active={sort ? "" : undefined} />
        {label}
      </button>
    </TableHead>
  );
}
