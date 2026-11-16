import { connection } from "next/server";
import { isValidElement, type ReactElement } from "react";

import RootLayout, { metadata, viewport } from "@/app/layout";

jest.mock("next/server", () => ({ connection: jest.fn(async () => {}) }));
jest.mock("next/headers", () => ({ headers: async () => new Headers({ "x-nonce": "test-nonce" }) }));

describe("RootLayout", () => {
  it("AC-SEC-4: waits for the request so every route renders dynamically and gets the CSP nonce", async () => {
    const tree = await RootLayout({ children: null });
    expect(connection).toHaveBeenCalledTimes(1);
    expect(isValidElement(tree)).toBe(true);
  });

  it("AC-A11Y-3: the document language is en-AU", async () => {
    const tree = (await RootLayout({ children: null })) as ReactElement<{ lang: string }>;
    expect(tree.type).toBe("html");
    expect(tree.props.lang).toBe("en-AU");
  });

  it("AC-THM-1: declares both colour schemes so the browser themes the page before CSS loads", () => {
    expect(viewport.colorScheme).toBe("light dark");
  });

  it("opts into the OS text size, which the rem-based sizes follow", () => {
    expect(metadata.other).toEqual({ "text-scale": "scale" });
  });
});
