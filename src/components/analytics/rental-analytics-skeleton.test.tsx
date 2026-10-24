import { render, screen } from "@testing-library/react";

import { RentalAnalyticsSkeleton } from "@/components/analytics/rental-analytics-skeleton";

describe("RentalAnalyticsSkeleton", () => {
  it("AC-STE-1: announces loading and reserves each card's final size", () => {
    render(<RentalAnalyticsSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading rental analytics");
    expect(screen.getAllByTestId("skeleton-kpi")).toHaveLength(4);
    expect(screen.getByTestId("skeleton-trend")).toHaveClass("h-60");
    expect(screen.getAllByTestId("skeleton-state-row")).toHaveLength(8);
    expect(screen.getAllByTestId("skeleton-table-row")).toHaveLength(9);
  });
});
