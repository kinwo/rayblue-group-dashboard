import { render, screen, within } from "@testing-library/react";

import RentalAnalyticsPage from "@/app/rental-analytics/page";
import { installChartLayout, installDomPolyfills } from "@/components/testing/dom";
import type { ListingRepository } from "@/data/repository.types";
import { DEFAULT_AS_OF } from "@/data/seed-config";
import { createTestRepository } from "@/test/db";
import { DataUnavailableError } from "@/utils/errors";

// The page runs the real service on an in-memory SQLite repository; only the
// runtime repository getter and Next's request APIs are swapped out.
let mockRepo: ListingRepository;
jest.mock("../../data/listing-repository", () => ({
  ...jest.requireActual("../../data/listing-repository"),
  getListingRepository: () => mockRepo,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/rental-analytics",
}));

const HOUR = 60 * 60 * 1000;
let close: () => void = () => {};

beforeAll(() => {
  installDomPolyfills();
  installChartLayout();
});
beforeEach(() => {
  const test = createTestRepository({
    agencies: [
      { id: 1, name: "Rayblue Parramatta", state: "NSW" },
      { id: 2, name: "Rayblue Fitzroy", state: "VIC" },
    ],
    listings: [
      { agencyId: 1, listedDate: DEFAULT_AS_OF - 1 * HOUR },
      { agencyId: 1, listedDate: DEFAULT_AS_OF - 2 * HOUR },
      { agencyId: 2, listedDate: DEFAULT_AS_OF - 3 * HOUR },
    ],
  });
  mockRepo = test.repo;
  close = test.close;
});
afterEach(() => close());

async function renderPage(raw: Record<string, string | string[] | undefined>) {
  render(await RentalAnalyticsPage({ searchParams: Promise.resolve(raw) }));
}

const kpiValues = () =>
  within(screen.getByRole("region", { name: "Listing totals" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

describe("Rental analytics page", () => {
  it("AC-FLT-1, AC-HDR-1: no params show the whole group, Daily, with the meta line", async () => {
    await renderPage({});
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText("All states and territories · Sample data · Updated 9:00 am, 24 Oct 2026")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Daily" })).toHaveAttribute("aria-selected", "true");
    expect(kpiValues()[0]).toMatch(/^New listings today3To 9:00 am/);
  });

  it("AC-KPI-1: a state narrows the figures", async () => {
    await renderPage({ state: "VIC" });
    expect(screen.getByText("Victoria · Sample data · Updated 9:00 am, 24 Oct 2026")).toBeInTheDocument();
    expect(kpiValues()[0]).toMatch(/^New listings today1/);
    expect(kpiValues()[3]).toBe("Agencies1In Victoria");
  });

  it("AC-FLT-8: malformed params fall back to defaults without echoing input", async () => {
    const junk = "<script>x</script>".repeat(600);
    await renderPage({ state: "XYZ", granularity: "hourly", agencyId: junk });
    const text = document.body.textContent ?? "";
    expect(text).toContain("All states and territories · Sample data");
    for (const echo of ["XYZ", "hourly", "<script>"]) expect(text).not.toContain(echo);
  });

  it("AC-FLT-9: an agency outside the selected state is dropped, the state kept", async () => {
    await renderPage({ state: "VIC", agencyId: "1", granularity: "weekly" });
    expect(screen.getByRole("combobox", { name: "Agency" })).toHaveTextContent("All agencies");
    expect(screen.getByRole("combobox", { name: "State or territory" })).toHaveTextContent("Victoria");
    expect(screen.getByRole("tab", { name: "Weekly" })).toHaveAttribute("aria-selected", "true");
  });

  it("AC-A11Y-3: labelled sections for every card, inside the period panel", async () => {
    await renderPage({});
    for (const name of ["Filters", "Listing totals", "New listings per day", "New listings by state", "Top agencies"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    expect(within(screen.getByRole("tabpanel")).getByRole("region", { name: "Top agencies" })).toBeInTheDocument();
  });

  it("AC-STE-2: a scope with no listings shows zeros, not an error", async () => {
    await renderPage({ state: "TAS" });
    expect(kpiValues().slice(0, 3).every((t) => /^New listings (today|this week|this month)0/.test(t ?? ""))).toBe(true);
    expect(screen.getByText("No agencies match these filters.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("AC-STE-3: a data outage propagates to the error boundary", async () => {
    const down = () => Promise.reject(new DataUnavailableError());
    mockRepo = { listAgencies: down, listListingTimes: down, getDatasetMeta: down, ping: down };
    await expect(RentalAnalyticsPage({ searchParams: Promise.resolve({}) })).rejects.toBeInstanceOf(DataUnavailableError);
  });
});
