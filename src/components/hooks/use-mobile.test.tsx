import { act, renderHook } from "@testing-library/react";

import { MOBILE_QUERY, useIsMobile } from "@/components/hooks/use-mobile";
import { setViewportWidth } from "@/components/testing/viewport";

describe("useIsMobile", () => {
  it("AC-NAV-4: uses the rem breakpoint the CSS uses, so both move with the browser's font size", () => {
    expect(MOBILE_QUERY).toBe("(width < 50.5rem)");
  });

  it("AC-NAV-4: is true below about 808px and false from there up", () => {
    setViewportWidth(807);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
    setViewportWidth(808);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });

  it("follows the viewport when it crosses the breakpoint", () => {
    setViewportWidth(1440);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    act(() => setViewportWidth(500));
    expect(result.current).toBe(true);
    act(() => setViewportWidth(1024));
    expect(result.current).toBe(false);
  });
});
