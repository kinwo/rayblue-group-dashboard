import { render, screen } from "@testing-library/react";

import { NonceProvider, useNonce } from "@/components/security/nonce";

function ShowNonce() {
  return <p>{useNonce() ?? "none"}</p>;
}

describe("NonceProvider", () => {
  afterEach(() => {
    globalThis.__webpack_nonce__ = undefined;
  });

  it("AC-SEC-4: exposes the nonce to components and to get-nonce", () => {
    render(
      <NonceProvider nonce="abc123">
        <ShowNonce />
      </NonceProvider>,
    );
    expect(screen.getByText("abc123")).toBeInTheDocument();
    expect(globalThis.__webpack_nonce__).toBe("abc123");
  });

  it("has no nonce outside a provider", () => {
    render(<ShowNonce />);
    expect(screen.getByText("none")).toBeInTheDocument();
  });
});
