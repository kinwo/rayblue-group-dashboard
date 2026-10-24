import { render, screen, within } from "@testing-library/react";

import { KpiTiles } from "@/components/analytics/kpi-tiles";
import styles from "@/components/analytics/kpi-tiles.module.css";
import { makeView } from "@/components/testing/fixtures";

function tiles(view = makeView()) {
  render(<KpiTiles kpis={view.kpis} scope={view.scope} asOf={view.asOf} />);
  const section = screen.getByRole("region", { name: "Listing totals" });
  return within(section).getAllByRole("listitem").map((li) => li.textContent);
}

describe("KpiTiles", () => {
  it("AC-KPI-1, AC-KPI-2, AC-KPI-4: four tiles with en-AU values and partial-period notes", () => {
    expect(tiles()).toEqual([
      "New listings today258To 9:00 am · last Saturday 241",
      "New listings this week1,932Week to date · last week 3,369",
      "New listings this month11,204Month to date · September 14,210",
      "Agencies4Across 8 states and territories",
    ]);
  });

  it("AC-KPI-1: the Agencies tile names the selected state", () => {
    const view = makeView({
      scope: { label: "Victoria", seriesName: "Victoria", state: "VIC", agency: null },
      kpis: { ...makeView().kpis, agencyCount: 1, stateCount: 1 },
    });
    expect(tiles(view)[3]).toBe("Agencies1In Victoria");
  });

  it("AC-KPI-1: with an agency selected the tile shows 1 in the agency's state", () => {
    const agency = { id: 3, name: "Rayblue Parramatta", state: "NSW" as const };
    const view = makeView({
      scope: { label: agency.name, seriesName: agency.name, state: null, agency },
      kpis: { ...makeView().kpis, agencyCount: 1, stateCount: 1 },
    });
    expect(tiles(view)[3]).toBe("Agencies1In New South Wales");
  });

  it("AC-KPI-4: values use the tabular, uncoloured value style", () => {
    render(<KpiTiles {...makeView()} />);
    expect(screen.getByText("1,932")).toHaveClass(styles.value);
  });

  it("AC-STE-2: an empty scope shows zeros", () => {
    const zero = { current: 0, previous: 0, previousStart: makeView().kpis.today.previousStart };
    const view = makeView({
      kpis: { today: zero, thisWeek: { ...zero }, thisMonth: { ...zero, previousStart: makeView().kpis.thisMonth.previousStart }, agencyCount: 0, stateCount: 8 },
    });
    expect(tiles(view)).toEqual([
      "New listings today0To 9:00 am · last Saturday 0",
      "New listings this week0Week to date · last week 0",
      "New listings this month0Month to date · September 0",
      "Agencies0Across 8 states and territories",
    ]);
  });
});
