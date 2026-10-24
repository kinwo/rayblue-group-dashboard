import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ErrorPage from "@/app/error";
import { resetRetryMemory } from "@/components/hooks/use-guarded-retry";
import Forbidden from "@/app/forbidden";
import NotFound from "@/app/not-found";
import Unauthorized from "@/app/unauthorized";

// A server error carrying the kinds of detail that must never reach the page.
const leakyError = Object.assign(
  new Error("SQLITE_CANTOPEN: unable to open /var/app/data/rayblue.db (DATABASE_URL=file:./secret)"),
  { digest: "1234567890", stack: "Error: at listing-repository.ts:42 SELECT * FROM listings" },
);

afterEach(resetRetryMemory);

describe("error.tsx", () => {
  it("AC-STE-3: shows a plain message and a Retry button", () => {
    render(<ErrorPage error={leakyError} retry={() => {}} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("We can't load the figures right now");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("AC-STE-3: never shows the error message, digest, stack, SQL, path or env", () => {
    const { container } = render(<ErrorPage error={leakyError} retry={() => {}} />);
    const text = container.textContent ?? "";
    for (const leak of ["SQLITE", "/var/app", "DATABASE_URL", "1234567890", "SELECT", "listing-repository"]) {
      expect(text).not.toContain(leak);
    }
  });

  it("AC-STE-3: Retry re-fetches the segment", async () => {
    const retry = jest.fn();
    render(<ErrorPage error={leakyError} retry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

describe("not-found.tsx", () => {
  it("AC-STE-4: links back to Rental analytics", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Page not found");
    expect(screen.getByRole("link", { name: "Go to Rental analytics" })).toHaveAttribute("href", "/rental-analytics");
  });
});

describe("unauthorized.tsx and forbidden.tsx (ADR 0006)", () => {
  it.each([
    ["unauthorized", Unauthorized, "Please sign in to continue"],
    ["forbidden", Forbidden, "You don't have access to this page"],
  ] as const)("%s: a plain heading and a link back to Rental analytics", (_, View, heading) => {
    render(<View />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(heading);
    expect(screen.getByRole("link", { name: "Go to Rental analytics" })).toHaveAttribute("href", "/rental-analytics");
  });
});
