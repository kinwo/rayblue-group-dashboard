import { act, render, screen } from "@testing-library/react";

import { ConnectionBanner } from "@/components/layout/connection-banner";

function setOnline(online: boolean) {
  jest.spyOn(navigator, "onLine", "get").mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? "online" : "offline"));
  });
}

afterEach(() => jest.restoreAllMocks());

describe("ConnectionBanner (AC-STE-6)", () => {
  it("is silent online, announces going offline, and clears on reconnect", () => {
    render(<ConnectionBanner />);
    const region = screen.getByRole("status");
    expect(region).toBeEmptyDOMElement();

    setOnline(false);
    expect(region).toHaveTextContent("You’re offline");
    expect(region).toHaveTextContent("Filters will work again when you reconnect.");

    setOnline(true);
    expect(region).toBeEmptyDOMElement();
  });
});
