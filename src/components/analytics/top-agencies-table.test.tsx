import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TopAgenciesTable } from "@/components/analytics/top-agencies-table";
import styles from "@/components/analytics/top-agencies-table.module.css";
import { makeView } from "@/components/testing/fixtures";
import type { RentalAnalyticsView } from "@/services/rental-analytics.types";

function renderTable(v: RentalAnalyticsView = makeView()) {
  render(<TopAgenciesTable topAgencies={v.topAgencies} scope={v.scope} trend={v.trend} />);
  return screen.getByRole("table", { name: "Top agencies by new listings" });
}

const bodyRows = (table: HTMLElement) => within(table).getAllByRole("row").slice(1);
const names = (table: HTMLElement) => bodyRows(table).map((r) => within(r).getAllByRole("cell")[0].textContent);

describe("TopAgenciesTable", () => {
  it("AC-AGY-1, AC-AGY-7: captioned table, highest first", () => {
    const table = renderTable();
    expect(names(table)).toEqual(["Rayblue Parramatta", "Rayblue Fitzroy", "Rayblue Bondi", "Rayblue Brisbane City"]);
  });

  it("AC-AGY-2, AC-AGY-3: share to one decimal and vs previous with + / − / 0% / —", () => {
    const table = renderTable();
    const cells = bodyRows(table).map((r) => within(r).getAllByRole("cell").map((c) => c.textContent));
    expect(cells).toEqual([
      ["Rayblue Parramatta", "NSW", "1,800", "30.0%", "+6%"],
      ["Rayblue Fitzroy", "VIC", "1,500", "25.0%", "—"],
      ["Rayblue Bondi", "NSW", "1,200", "20.0%", "−3%"],
      ["Rayblue Brisbane City", "QLD", "900", "15.0%", "0%"],
    ]);
  });

  it("AC-AGY-7: numeric columns are right-aligned and tabular", () => {
    const table = renderTable();
    const [, , count, share, change] = within(bodyRows(table)[0]).getAllByRole("cell");
    [count, share, change].forEach((cell) => expect(cell).toHaveClass(styles.numeric));
  });

  it("Share header reads Share of group, or Share of NSW with a state", () => {
    renderTable();
    expect(screen.getByRole("columnheader", { name: /Share of group/ })).toBeInTheDocument();
  });

  it("Share header names the selected state", () => {
    renderTable(makeView({ scope: { label: "New South Wales", seriesName: "New South Wales", state: "NSW", agency: null } }));
    expect(screen.getByRole("columnheader", { name: /Share of NSW/ })).toBeInTheDocument();
    expect(screen.getByText("11 Oct to 24 Oct · New South Wales")).toBeInTheDocument();
  });

  it("AC-AGY-5: sortable headers are buttons exposing aria-sort", async () => {
    const table = renderTable();
    const countHeader = screen.getByRole("columnheader", { name: /New listings/ });
    expect(countHeader).toHaveAttribute("aria-sort", "descending");
    const agencyHeader = screen.getByRole("columnheader", { name: /Agency/ });
    expect(agencyHeader).toHaveAttribute("aria-sort", "none");

    await userEvent.click(within(agencyHeader).getByRole("button", { name: "Agency" }));
    expect(agencyHeader).toHaveAttribute("aria-sort", "ascending");
    expect(countHeader).toHaveAttribute("aria-sort", "none");
    expect(names(table)).toEqual(["Rayblue Bondi", "Rayblue Brisbane City", "Rayblue Fitzroy", "Rayblue Parramatta"]);

    await userEvent.click(within(agencyHeader).getByRole("button", { name: "Agency" }));
    expect(agencyHeader).toHaveAttribute("aria-sort", "descending");
    expect(names(table)[0]).toBe("Rayblue Parramatta");
  });

  it("AC-AGY-5: sorting by vs previous puts — last", async () => {
    const table = renderTable();
    await userEvent.click(screen.getByRole("button", { name: "vs previous" }));
    expect(names(table)).toEqual(["Rayblue Parramatta", "Rayblue Brisbane City", "Rayblue Bondi", "Rayblue Fitzroy"]);
  });

  it("AC-AGY-4: the selected agency's row is aria-selected, including a ninth row", () => {
    const base = makeView();
    const ninth = { agencyId: 42, name: "Rayblue Dubbo", state: "NSW" as const, count: 10, share: 0.002, previousCount: 9, change: 1 / 9, isSelected: true };
    const rows = [...base.topAgencies.rows, ...Array.from({ length: 4 }, (_, i) => ({ ...base.topAgencies.rows[3], agencyId: 100 + i, name: `Rayblue Extra ${i}`, count: 800 - i })), ninth];
    const table = renderTable(makeView({ topAgencies: { rows, scopeTotal: 9000 } }));
    const selected = bodyRows(table).filter((r) => r.getAttribute("aria-selected") === "true");
    expect(bodyRows(table)).toHaveLength(9);
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("Rayblue Dubbo");
  });

  it("AC-AGY-6: shows an empty state instead of rows", () => {
    const table = renderTable(makeView({ topAgencies: { rows: [], scopeTotal: 0 } }));
    expect(bodyRows(table)).toHaveLength(1);
    expect(within(table).getByText("No agencies match these filters.")).toBeInTheDocument();
  });
});
