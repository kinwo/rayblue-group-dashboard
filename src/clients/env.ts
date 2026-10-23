import { z } from "zod";
import { LOG_LEVELS } from "@/utils/logger";
import { version as packageVersion } from "../../package.json";

const envSchema = z.object({
  DATABASE_URL: z.string().trim().min(1).default("./data/rayblue.db"),
  APP_VERSION: z.string().trim().min(1).max(64).default(packageVersion),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
});

export type Env = z.infer<typeof envSchema>;

/** Names of the variables that failed validation; never their values (AC-SEC-5). */
export class InvalidEnvError extends Error {
  readonly name = "InvalidEnvError";
  constructor(readonly variables: string[]) {
    super(`Invalid environment variables: ${variables.join(", ")}`);
  }
}

/** Parses the environment once at an edge (start-up, CLI). Empty strings count as unset. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const input = Object.fromEntries(
    Object.keys(envSchema.shape).map((key) => [key, source[key] === "" ? undefined : source[key]]),
  );
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new InvalidEnvError(names);
  }
  return result.data;
}

let cached: Env | undefined;

/** The validated environment of this process, parsed on first use. */
export function getEnv(): Env {
  cached ??= loadEnv();
  return cached;
}
