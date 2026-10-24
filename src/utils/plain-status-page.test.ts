import fc from "fast-check";
import { methodNotAllowedPage, tooManyRequestsPage } from "@/utils/plain-status-page";

describe("plain status pages", () => {
  it("are complete documents with a heading and a way back, and nothing a CSP would block", () => {
    for (const html of [tooManyRequestsPage(30), methodNotAllowedPage()]) {
      expect(html).toMatch(/^<!doctype html>/);
      expect(html).toContain('lang="en-AU"');
      expect(html).toContain('<a href="/rental-analytics">Go to Rental analytics</a>');
      expect(html).not.toMatch(/<script|<style|\sstyle=|\son[a-z]+=/i);
    }
  });

  it("says how long to wait, in whole seconds of at least one", () => {
    expect(tooManyRequestsPage(30)).toContain("wait 30 seconds");
    expect(tooManyRequestsPage(1)).toContain("wait 1 second ");
    expect(tooManyRequestsPage(0.2)).toContain("wait 1 second ");
    expect(tooManyRequestsPage(Number.NaN)).toContain("wait 60 seconds");
    expect(tooManyRequestsPage(1e21)).toContain("wait 3600 seconds");
  });

  it("only ever interpolates a positive whole number", () => {
    fc.assert(
      fc.property(fc.double(), (seconds) => {
        const wait = /wait (\S+) second/.exec(tooManyRequestsPage(seconds))?.[1];
        expect(wait).toMatch(/^[1-9]\d*$/);
      }),
    );
  });
});
