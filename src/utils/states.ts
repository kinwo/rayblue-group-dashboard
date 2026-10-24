export const STATES = [
  { code: "NSW", name: "New South Wales" },
  { code: "VIC", name: "Victoria" },
  { code: "QLD", name: "Queensland" },
  { code: "WA", name: "Western Australia" },
  { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NT", name: "Northern Territory" },
] as const;

export type StateCode = (typeof STATES)[number]["code"];

export const STATE_CODES: readonly StateCode[] = STATES.map((s) => s.code);

export const ALL_STATES_LABEL = "All states and territories";

export function isStateCode(value: unknown): value is StateCode {
  return typeof value === "string" && (STATE_CODES as readonly string[]).includes(value);
}

export function stateName(code: StateCode): string {
  return STATES.find((s) => s.code === code)!.name;
}
