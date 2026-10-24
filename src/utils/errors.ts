// Typed errors shared by every layer. Messages are safe to log and never
// carry SQL, file paths or environment values (AC-SEC-5).

/** The data source cannot be read right now (missing file, locked, I/O error). */
export class DataUnavailableError extends Error {
  readonly name = "DataUnavailableError";
  constructor(options?: { cause?: unknown }) {
    super("The data source is unavailable.", options);
  }
}

/** The data source was read but its contents break an invariant (e.g. no dataset as-of time). */
export class DataIntegrityError extends Error {
  readonly name = "DataIntegrityError";
  constructor(detail: string) {
    super(`The dataset is invalid: ${detail}`);
  }
}
