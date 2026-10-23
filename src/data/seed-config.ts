import { z } from "zod";

/** Default PRNG seed for `npm run db:seed` (override with `SEED`). */
export const DEFAULT_SEED = 20261024;

/** 9:00 am Sat 24 Oct 2026 in Australia/Sydney (AEDT, UTC+11); override with `SEED_AS_OF`. */
export const DEFAULT_AS_OF = Date.UTC(2026, 9, 23, 22, 0, 0);

const seedEnvSchema = z.object({
  SEED: z.coerce.number().int().min(0).max(0xffffffff).default(DEFAULT_SEED),
  // An ISO 8601 date-time with an explicit offset, e.g. 2026-10-24T09:00:00+11:00.
  SEED_AS_OF: z.iso
    .datetime({ offset: true })
    .transform((value) => Date.parse(value))
    .optional(),
});

export type SeedOptions = { seed: number; asOf: number };

/** Validates `SEED` and `SEED_AS_OF`; empty strings count as unset. */
export function parseSeedOptions(env: Record<string, string | undefined>): SeedOptions {
  const blankToUndefined = (v: string | undefined) => (v === "" ? undefined : v);
  const result = seedEnvSchema.safeParse({ SEED: blankToUndefined(env.SEED), SEED_AS_OF: blankToUndefined(env.SEED_AS_OF) });
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new Error(`Invalid seed options: ${names.join(", ")}`);
  }
  return { seed: result.data.SEED, asOf: result.data.SEED_AS_OF ?? DEFAULT_AS_OF };
}
