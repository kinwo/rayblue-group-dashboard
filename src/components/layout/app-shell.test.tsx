import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppShell } from "@/components/layout/app-shell";
import { contextLine } from "@/components/layout/app-sidebar";
import { setViewportWidth } from "@/components/testing/viewport";

let mockPathname = "/rental-analytics";
let mockSearch = "";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

function renderShell() {
  return render(
    <AppShell>
      <h1>Rental analytics</h1>
    </AppShell>,
  );
}

beforeEach(() => {
  mockPathname = "/rental-analytics";
  mockSearch = "";
});

describe("AppShell on desktop", () => {
  beforeEach(() => setViewportWidth(1440));

  it("AC-NAV-1: shows the product, the scope context line and exactly one nav item", () => {
    const { container } = renderShell();
    const sidebar = container.querySelector<HTMLElement>('[data-slot="sidebar"]')!;
    expect(within(sidebar).getByText("Rayblue Agency Group")).toBeInTheDocument();
    expect(screen.getByText("Group office · All states and territories")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getAllByRole("link")).toHaveLength(1);
    expect(within(nav).getByRole("link", { name: "Rental analytics" })).toHaveAttribute("href", "/rental-analytics");
  });

  it("AC-NAV-1: the context line follows the state filter", () => {
    mockSearch = "state=VIC";
    renderShell();
    expect(screen.getByText("Group office · Victoria")).toBeInTheDocument();
  });

  it("AC-NAV-2: marks Rental analytics as the current page", () => {
    renderShell();
    expect(screen.getByRole("link", { name: "Rental analytics" })).toHaveAttribute("aria-current", "page");
  });

  it("AC-NAV-2: no current marker on other routes", () => {
    mockPathname = "/somewhere-else";
    renderShell();
    expect(screen.getByRole("link", { name: "Rental analytics" })).not.toHaveAttribute("aria-current");
  });

  it("AC-NAV-5: the nav item is reachable with Tab", async () => {
    renderShell();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Rental analytics" })).toHaveFocus();
  });

  it("AC-NAV-6: the footer shows the viewing context, never a signed-in user", () => {
    renderShell();
    expect(screen.getByText("Group manager view")).toBeInTheDocument();
    expect(screen.queryByText(/signed in/i)).not.toBeInTheDocument();
  });

  it("renders the page inside the main landmark", () => {
    renderShell();
    expect(within(screen.getByRole("main")).getByRole("heading", { level: 1 })).toHaveTextContent("Rental analytics");
  });
});

describe("AppShell below 808px", () => {
  beforeEach(() => setViewportWidth(500));

  it("AC-NAV-4: hides the sidebar behind a labelled menu button that opens a sheet", async () => {
    renderShell();
    expect(screen.queryByRole("link", { name: "Rental analytics" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByRole("link", { name: "Rental analytics" })).toBeInTheDocument();
  });

  it("AC-NAV-4: the sheet closes with Escape and focus returns to the menu button", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveFocus();
  });

  it("AC-NAV-4: the sheet closes after choosing an item and focus returns to the menu button", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Open navigation menu" }));
    const sheet = await screen.findByRole("dialog");
    // Without an app router, next/link falls back to a native navigation jsdom can't perform.
    // Cancel it in the capture phase; the link's onClick still runs and closes the sheet.
    const stopNavigation = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("click", stopNavigation, true);
    await userEvent.click(within(sheet).getByRole("link", { name: "Rental analytics" }));
    document.removeEventListener("click", stopNavigation, true);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveFocus();
  });
});

describe("contextLine", () => {
  it("falls back to all states for unknown values", () => {
    expect(contextLine("XYZ")).toBe("Group office · All states and territories");
    expect(contextLine(null)).toBe("Group office · All states and territories");
    expect(contextLine("NSW")).toBe("Group office · New South Wales");
  });
});
