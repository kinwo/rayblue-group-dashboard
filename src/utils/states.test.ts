import { STATES, isStateCode, stateName } from "@/utils/states";

describe("states", () => {
  it("lists the eight states and territories in display order", () => {
    expect(STATES.map((s) => s.code)).toEqual(["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]);
  });

  it("narrows only known codes", () => {
    expect(isStateCode("VIC")).toBe(true);
    expect(isStateCode("XYZ")).toBe(false);
    expect(isStateCode(undefined)).toBe(false);
  });

  it("names a state", () => {
    expect(stateName("ACT")).toBe("Australian Capital Territory");
  });
});
