#!/bin/bash
# Open a URL in the e2e session; wait out the app's page rate limit (ADR 0004) instead of testing the 429 page.
export AGENT_BROWSER_SESSION=${AGENT_BROWSER_SESSION:-e2e}
for i in 1 2 3 4 5 6; do
  agent-browser open "$1" >/dev/null 2>&1
  t=$(agent-browser get title 2>/dev/null)
  case "$t" in *"Rental analytics"*|*"Page not found"*) [ -n "$2" ] && agent-browser wait --text "$2" >/dev/null 2>&1; exit 0;; esac
  sleep 20
done
echo "open.sh: gave up on $1 (last title: $t)" >&2; exit 1
