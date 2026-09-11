#!/bin/bash
# Runs an e2e suite (by --grep pattern), retrying the whole npm invocation up
# to 3 times if it exits non-zero. Playwright's own per-test retries can get
# fully consumed by the environment's intermittent _dyld_start install hang
# before any real test logic ever runs; this outer loop protects against
# that by giving the suite fresh outer attempts too.
GREP="${1:?usage: run-suite.sh <grep-pattern> <log-file>}"
LOG="${2:?usage: run-suite.sh <grep-pattern> <log-file>}"
cd "$(dirname "$0")/.."
for attempt in 1 2 3 4 5; do
  echo "=== OUTER ATTEMPT $attempt ===" >> "$LOG"
  PW_TEST_HTML_REPORT_OPEN=never npm run e2e-test -- --grep "$GREP" >> "$LOG" 2>&1
  if [ $? -eq 0 ]; then
    echo "=== OUTER ATTEMPT $attempt SUCCEEDED ===" >> "$LOG"
    exit 0
  fi
  echo "=== OUTER ATTEMPT $attempt FAILED ===" >> "$LOG"
done
exit 1
