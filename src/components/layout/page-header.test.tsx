import { render, screen } from "@testing-library/react";

import { PageHeader } from "@/components/layout/page-header";
import { AS_OF } from "@/components/testing/fixtures";

const props = { title: "Rental analytics", scopeLabel: "All states and territories", asOf: AS_OF, isStale: false };

describe("PageHeader", () => {
  it("AC-HDR-1, AC-PRV-4: one h1 and the scope · Sample data · Updated meta line in Sydney time", () => {
    render(<PageHeader {...props} />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rental analytics");
    expect(
      screen.getByText("All states and territories · Sample data · Updated 9:00 am, 24 Oct 2026"),
    ).toBeInTheDocument();
  });

  it("AC-HDR-1: the meta line names the scope", () => {
    render(<PageHeader {...props} scopeLabel="Victoria" />);
    expect(screen.getByText("Victoria · Sample data · Updated 9:00 am, 24 Oct 2026")).toBeInTheDocument();
  });

  it("AC-HDR-2: no alert while the data is fresh", () => {
    render(<PageHeader {...props} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("AC-HDR-2: a warning alert says when the data was last updated", () => {
    render(<PageHeader {...props} isStale />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Figures may be out of date");
    expect(alert).toHaveTextContent("The data was last updated at 9:00 am, 24 Oct 2026");
  });
});
