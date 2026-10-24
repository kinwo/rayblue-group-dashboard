import fc from "fast-check";

import { CATEGORICAL_COLORS, SINGLE_SERIES_COLOR, stateColor } from "@/utils/chart-colors";
import { STATE_CODES } from "@/utils/states";

describe("chart colours", () => {
  it("uses --chart-1 for a single series", () => {
    expect(SINGLE_SERIES_COLOR).toBe("var(--chart-1)");
  });

  it("gives each state a palette colour fixed by its code, whatever the order", () => {
    fc.assert(
      fc.property(fc.shuffledSubarray([...STATE_CODES]), (codes) => {
        const byOrder = codes.map(stateColor);
        codes.forEach((code, i) => {
          expect(byOrder[i]).toBe(stateColor(code));
          expect(CATEGORICAL_COLORS).toContain(byOrder[i]);
        });
      }),
    );
  });

  it("starts with NSW on --chart-1", () => {
    expect(stateColor("NSW")).toBe("var(--chart-1)");
  });
});
