// Structured server logs: one JSON object per line (AC-REL-7). Only the fields below are
// accepted, so request bodies, cookies, headers and personal data have nowhere to go.
// Errors are reduced to name, a safe message and a driver code; never a stack (AC-SEC-5).

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogFields = {
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  /** Short machine-readable reason, e.g. "migration_mismatch". */
  reason?: string;
  version?: string;
  /** React/Next error digest, safe to correlate with what the client saw. */
  digest?: string;
  error?: unknown;
};

export type SafeError = { name: string; message?: string; code?: string };

export type LogEntry = Omit<LogFields, "error"> & {
  time: string;
  level: LogLevel;
  msg: string;
  error?: SafeError;
};

export type Logger = Record<LogLevel, (msg: string, fields?: LogFields) => void>;

// Errors whose messages are written by us and known to carry no SQL, paths or values.
const SAFE_MESSAGE_ERRORS = new Set([
  "DataUnavailableError",
  "DataIntegrityError",
  "InvalidEnvError",
  "StartupCheckError",
]);

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;

/** Reduces any thrown value to fields that are safe to log. */
export function toSafeError(error: unknown): SafeError {
  if (!(error instanceof Error)) return { name: typeof error };
  const name = NAME_PATTERN.test(error.name) ? error.name : "Error";
  const safe: SafeError = { name };
  if (SAFE_MESSAGE_ERRORS.has(name)) safe.message = error.message;
  const code = (error as { code?: unknown }).code;
  const causeCode = (error.cause as { code?: unknown } | undefined)?.code;
  const found = [code, causeCode].find((c): c is string => typeof c === "string" && CODE_PATTERN.test(c));
  if (found) safe.code = found;
  return safe;
}

const RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && (LOG_LEVELS as readonly string[]).includes(value);
}

export type LoggerOptions = {
  level?: LogLevel;
  write?: (line: string) => void;
  now?: () => number;
};

export function createLogger({
  level = "info",
  // console.log writes one line to stdout on Node and works in the Edge runtime too.
  write = (line) => console.log(line),
  now = () => Date.now(),
}: LoggerOptions = {}): Logger {
  const log = (entryLevel: LogLevel) => (msg: string, fields: LogFields = {}) => {
    if (RANK[entryLevel] < RANK[level]) return;
    const { route, method, status, durationMs, reason, version, digest, error } = fields;
    const entry: LogEntry = {
      time: new Date(now()).toISOString(),
      level: entryLevel,
      msg: msg.replace(/[\r\n]+/g, " "),
      route,
      method,
      status,
      durationMs: durationMs === undefined ? undefined : Math.round(durationMs),
      reason,
      version,
      digest,
      error: error === undefined ? undefined : toSafeError(error),
    };
    write(JSON.stringify(entry));
  };
  return { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") };
}

/** The process logger. Level from `LOG_LEVEL` (validated at start-up), default "info". */
export const logger: Logger = createLogger({
  level: isLogLevel(process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : "info",
});
