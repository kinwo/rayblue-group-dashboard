import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fc from "fast-check";

import { Filters, filtersForState } from "@/components/analytics/filters";
import { installDomPolyfills } from "@/components/testing/dom";
import { AGENCIES } from "@/components/testing/fixtures";
import type { AgencyOption } from "@/services/rental-analytics.types";
import { DEFAULT_FILTERS, type AnalyticsFilters } from "@/utils/search-params";
import { STATE_CODES, STATES } from "@/utils/states";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/rental-analytics",
}));

beforeAll(installDomPolyfills);
beforeEach(() => push.mockClear());

function renderFilters(filters: Partial<AnalyticsFilters> = {}, agencyOptions: AgencyOption[] = AGENCIES) {
  return render(
    <Filters filters={{ ...DEFAULT_FILTERS, ...filters }} agencyOptions={agencyOptions}>
      <p>Period view</p>
    </Filters>,
  );
}

const pushedUrl = () => push.mock.calls.at(-1)?.[0];

describe("Filters", () => {
  it("AC-FLT-1: defaults show all states, all agencies and Daily", () => {
    renderFilters();
    expect(screen.getByRole("combobox", { name: "State or territory" })).toHaveTextContent("All states and territories");
    expect(screen.getByRole("combobox", { name: "Agency" })).toHaveTextContent("All agencies");
    expect(screen.getByRole("tab", { name: "Daily" })).toHaveAttribute("aria-selected", "true");
  });

  it("AC-FLT-2: the state select offers All followed by the eight full names", async () => {
    renderFilters();
    await userEvent.click(screen.getByRole("combobox", { name: "State or territory" }));
    const options = within(screen.getByRole("listbox")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["All states and territories", ...STATES.map((s) => s.name)]);
  });

  it("AC-FLT-5: choosing a state pushes the state param and nothing else", async () => {
    renderFilters();
    await userEvent.click(screen.getByRole("combobox", { name: "State or territory" }));
    await userEvent.click(screen.getByRole("option", { name: "Victoria" }));
    expect(pushedUrl()).toBe("/rental-analytics?state=VIC");
  });

  it("AC-FLT-5: choosing All states drops the state param", async () => {
    renderFilters({ state: "NSW", granularity: "weekly" });
    await userEvent.click(screen.getByRole("combobox", { name: "State or territory" }));
    await userEvent.click(screen.getByRole("option", { name: "All states and territories" }));
    expect(pushedUrl()).toBe("/rental-analytics?granularity=weekly");
  });

  it("AC-FLT-3: the agency list starts with All agencies, sorted by name, each with its state", async () => {
    renderFilters();
    await userEvent.click(screen.getByRole("combobox", { name: "Agency" }));
    const options = within(screen.getByRole("listbox", { name: "Agencies" })).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "All agencies",
      "Rayblue BondiNSW",
      "Rayblue Brisbane CityQLD",
      "Rayblue FitzroyVIC",
      "Rayblue ParramattaNSW",
    ]);
  });

  it("AC-FLT-3: typing jumps to matching agencies, and choosing one pushes agencyId", async () => {
    renderFilters({ state: "NSW" });
    await userEvent.click(screen.getByRole("combobox", { name: "Agency" }));
    await userEvent.type(screen.getByRole("combobox", { name: "Search agencies" }), "parra");
    const options = within(screen.getByRole("listbox", { name: "Agencies" })).getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Rayblue ParramattaNSW"]);
    await userEvent.keyboard("{Enter}");
    expect(pushedUrl()).toBe("/rental-analytics?state=NSW&agencyId=3");
  });

  it("AC-FLT-3: shows the selected agency and can go back to All agencies", async () => {
    renderFilters({ agencyId: 7 });
    expect(screen.getByRole("combobox", { name: "Agency" })).toHaveTextContent("Rayblue Fitzroy");
    await userEvent.click(screen.getByRole("combobox", { name: "Agency" }));
    await userEvent.click(screen.getByRole("option", { name: "All agencies" }));
    expect(pushedUrl()).toBe("/rental-analytics");
  });

  it("AC-FLT-4: Daily, Weekly and Monthly tabs with arrow-key navigation", async () => {
    renderFilters();
    const tablist = screen.getByRole("tablist", { name: "Listing period" });
    expect(within(tablist).getAllByRole("tab").map((t) => t.textContent)).toEqual(["Daily", "Weekly", "Monthly"]);
    // Focusing a tab updates Radix's roving-focus state, so it must run inside act().
    act(() => screen.getByRole("tab", { name: "Daily" }).focus());
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Weekly" })).toHaveFocus();
    expect(pushedUrl()).toBe("/rental-analytics?granularity=weekly");
  });

  it("AC-FLT-5: the selected tab labels the period panel", () => {
    renderFilters({ granularity: "monthly" });
    expect(screen.getByRole("tabpanel", { name: "Monthly" })).toHaveTextContent("Period view");
  });

  it("AC-FLT-5: the props, not local state, decide what is shown", async () => {
    const { rerender } = renderFilters();
    await userEvent.click(screen.getByRole("tab", { name: "Monthly" }));
    expect(screen.getByRole("tab", { name: "Daily" })).toHaveAttribute("aria-selected", "true");
    rerender(
      <Filters filters={{ ...DEFAULT_FILTERS, granularity: "monthly" }} agencyOptions={AGENCIES}>
        <p>Period view</p>
      </Filters>,
    );
    expect(screen.getByRole("tab", { name: "Monthly" })).toHaveAttribute("aria-selected", "true");
  });

  it("AC-FLT-10: changing to a state without the selected agency resets the agency", async () => {
    renderFilters({ agencyId: 3, granularity: "weekly" });
    await userEvent.click(screen.getByRole("combobox", { name: "State or territory" }));
    await userEvent.click(screen.getByRole("option", { name: "Victoria" }));
    expect(pushedUrl()).toBe("/rental-analytics?state=VIC&granularity=weekly");
  });

  it("AC-FLT-10: changing to the agency's own state keeps it", async () => {
    renderFilters({ agencyId: 3 });
    await userEvent.click(screen.getByRole("combobox", { name: "State or territory" }));
    await userEvent.click(screen.getByRole("option", { name: "New South Wales" }));
    expect(pushedUrl()).toBe("/rental-analytics?state=NSW&agencyId=3");
  });
});

describe("filtersForState", () => {
  it("AC-FLT-10: keeps an agency only when the new state contains it", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...AGENCIES.map((a) => a.id), null),
        fc.constantFrom(...STATE_CODES, null),
        (agencyId, state) => {
          const next = filtersForState({ ...DEFAULT_FILTERS, agencyId }, state, AGENCIES);
          expect(next.state).toBe(state);
          if (next.agencyId !== null) {
            const agency = AGENCIES.find((a) => a.id === next.agencyId)!;
            expect(state === null || agency.state === state).toBe(true);
            expect(next.agencyId).toBe(agencyId);
          }
        },
      ),
    );
  });
});
