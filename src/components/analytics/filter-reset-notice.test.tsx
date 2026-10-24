import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FilterResetNotice, resetSentence } from "@/components/analytics/filter-reset-notice";

describe("FilterResetNotice (AC-FLT-11)", () => {
  it("renders nothing when no filter was reset", () => {
    const { container } = render(<FilterResetNotice reset={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names each reset filter and what is shown instead, as a status, not an alert", () => {
    render(<FilterResetNotice reset={["state", "agencyId"]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Some filters were reset");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      resetSentence("state"),
      resetSentence("agencyId"),
    ]);
    expect(resetSentence("granularity")).toMatch(/Listing period .* daily figures\.$/);
  });

  it("can be dismissed", async () => {
    render(<FilterResetNotice reset={["granularity"]} />);
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Some filters were reset")).not.toBeInTheDocument();
  });
});
