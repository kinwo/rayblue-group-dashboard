import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { resetRetryMemory } from "@/components/hooks/use-guarded-retry";
import { DataFailureView } from "@/components/layout/data-failure-view";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

afterEach(resetRetryMemory);

describe("DataFailureView", () => {
  it("AC-STE-5: unavailable data is retryable and re-renders the page on the server", async () => {
    render(<DataFailureView kind="unavailable" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("We can't reach the listing data right now");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("AC-STE-7: invalid data is withheld with a plain explanation", () => {
    render(<DataFailureView kind="invalid" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("These figures failed a safety check");
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument();
  });
});
