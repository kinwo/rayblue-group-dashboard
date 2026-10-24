// Minimal HTML for responses the proxy answers before any page renders (429, 405).
// Static markup only: no scripts, no styles, nothing from the request, so it is safe under
// NON_PAGE_CONTENT_SECURITY_POLICY and cannot reflect input.

const HOME = "/rental-analytics";

function page(title: string, message: string): string {
  return [
    "<!doctype html>",
    '<html lang="en-AU">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title} · Rayblue Agency Group</title></head>`,
    `<body><main><h1>${title}</h1><p>${message}</p><p><a href="${HOME}">Go to Rental analytics</a></p></main></body>`,
    "</html>",
  ].join("\n");
}

/** Longest wait the page will state; the limiter's window is far shorter. */
const MAX_WAIT_SECONDS = 3600;

/** "Please wait 30 seconds"; `retryAfterSeconds` is clamped to a whole number in 1..3600. */
export function tooManyRequestsPage(retryAfterSeconds: number): string {
  const finite = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : 60;
  const seconds = Math.min(MAX_WAIT_SECONDS, Math.max(1, Math.ceil(finite)));
  return page(
    "Too many requests",
    `You've loaded pages faster than we allow. Please wait ${seconds} ${seconds === 1 ? "second" : "seconds"} and try again.`,
  );
}

export function methodNotAllowedPage(): string {
  return page("This action isn't supported", "This dashboard is read-only, so it only answers page views.");
}
