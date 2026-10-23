export const GRANULARITIES = ["daily", "weekly", "monthly"] as const;

export type Granularity = (typeof GRANULARITIES)[number];

export const DEFAULT_GRANULARITY: Granularity = "daily";
