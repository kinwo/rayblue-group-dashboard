import { render, screen, within } from "@testing-library/react";
import fc from "fast-check";

import { barPercent, StateBars } from "@/components/analytics/state-bars";
import { makeView } from "@/components/testing/fixtures";

const view = makeView();

const bar = (li: HTMLElement) => li.querySelector("[aria-hidden] > span") as HTMLElement;

function rows(v = view) {
  render(<StateBars byState={v.byState} scope={v.scope} trend={v.trend} />);
  return within(screen.getByRole("region", { name: "New listings by state" })).getAllByRole("listitem");
}

describe("StateBars", () => {
  it("AC-STA-1: all eight states, highest first, including states with 0", () => {
    const items = rows();
    expect(items).toHaveLength(8);
    expect(items.slice(0, 3).map((li) => li.querySelector("abbr")?.textContent)).toEqual(["NSW", "VIC", "QLD"]);
    expect(items[7]).toHaveTextContent("0 agencies");
  });

  it("AC-STA-2: code, agency count with singular, and tabular count", () => {
    const items = rows();
    expect(items[0]).toHaveTextContent("NSWNew South Wales2 agencies3,000");
    expect(items[1]).toHaveTextContent("VICVictoria1 agency1,500");
  });

  it("AC-STA-2: bars are scaled to the highest value", () => {
    const items = rows();
    const width = (li: HTMLElement) => bar(li).style.width;
    expect(width(items[0])).toBe("100%");
    expect(width(items[1])).toBe("50%");
    expect(width(items[7])).toBe("0%");
  });

  it("AC-STA-3: no fading and an all-states description without a filter", () => {
    const items = rows();
    expect(screen.getByText("11 Oct to 24 Oct · All states and territories")).toBeInTheDocument();
    items.forEach((li) => expect(bar(li)).not.toHaveAttribute("data-faded"));
  });

  it("AC-STA-3: other states' bars fade to 35% when a state is selected; the description names it", () => {
    const items = rows(makeView({ scope: { label: "Victoria", seriesName: "Victoria", state: "VIC", agency: null } }));
    expect(screen.getByText("11 Oct to 24 Oct · Victoria highlighted")).toBeInTheDocument();
    expect(bar(items[1])).not.toHaveAttribute("data-faded");
    expect(bar(items[0])).toHaveAttribute("data-faded");
    expect(items).toHaveLength(8);
  });

  it("AC-STA-3: an agency selection highlights the agency's state", () => {
    const agency = { id: 9, name: "Rayblue Brisbane City", state: "QLD" as const };
    const items = rows(makeView({ scope: { label: agency.name, seriesName: agency.name, state: null, agency } }));
    expect(screen.getByText(/Queensland highlighted/)).toBeInTheDocument();
    expect(bar(items[2])).not.toHaveAttribute("data-faded");
  });

  it("keeps labels and counts at full opacity so faded rows still meet text contrast", () => {
    const items = rows(makeView({ scope: { label: "Victoria", seriesName: "Victoria", state: "VIC", agency: null } }));
    items.forEach((li) => {
      expect(li).not.toHaveAttribute("data-faded");
      li.querySelectorAll("[data-faded]").forEach((faded) => expect(faded).toBe(bar(li)));
    });
  });
});

describe("barPercent", () => {
  it("is between 0 and 100 and 100 at the max", () => {
    fc.assert(
      fc.property(fc.nat(), fc.nat(), (a, b) => {
        const max = Math.max(a, b);
        const p = barPercent(a, max);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(100);
        if (max > 0) expect(barPercent(max, max)).toBe(100);
      }),
    );
  });
});
