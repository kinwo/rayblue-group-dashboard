import * as React from "react"

// Same value as --breakpoint-md in globals.css (DESIGN.md §5: the nav becomes a sheet below ~808px).
// In rem, like the CSS, so both move together when the browser's default font size changes.
export const MOBILE_QUERY = "(width < 50.5rem)"

function subscribe(onChange: () => void): () => void {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

/** True below the md breakpoint. The server render assumes desktop; CSS hides whichever nav doesn't apply. */
export function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false,
  )
}
