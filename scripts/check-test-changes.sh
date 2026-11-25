#!/usr/bin/env bash
# Fails when a change removes or rewrites lines in a test file.
#
# Adding tests is always fine: new test files, new tests, new checks in an
# existing test. Deleting or editing an existing line can quietly weaken what
# the suite protects, so it gets flagged for a human to look at.
#
# Usage: scripts/check-test-changes.sh <base-ref>   (e.g. origin/main)
# Compares <base-ref>...HEAD, i.e. only what this branch changed since it
# forked from the base — not what landed on the base in the meantime.
set -euo pipefail

base="${1:?usage: $0 <base-ref>, e.g. origin/main}"

# A test file is a unit test (*.spec.ts, *.test.tsx), an integration test
# (*.int-spec.ts) or anything in the Playwright folder.
is_test_file() {
  [[ "$1" == *.spec.ts || "$1" == *.int-spec.ts || "$1" == *.test.tsx || "$1" == apps/frontend/e2e/* ]]
}

# Run the diff on its own first: inside `< <(...)` a failing git (say, a base
# ref that was never fetched) would be ignored and the check would pass.
numstat="$(git diff --numstat --no-renames "$base...HEAD")"

flagged=()
# --no-renames: a moved test file counts as the old file removed, so moving or
# renaming a test is reviewed like any other removal.
while IFS=$'\t' read -r added removed path; do
  [[ -n "$path" ]] || continue
  is_test_file "$path" || continue
  # Binary files report "-" for both counts.
  if [[ "$removed" == "-" || "$removed" -gt 0 ]]; then
    flagged+=("$path (+$added -$removed)")
  fi
done <<<"$numstat"

if ((${#flagged[@]} == 0)); then
  echo "OK: test files only gained lines compared with $base."
  exit 0
fi

echo "These test files have removed or rewritten lines compared with $base:"
printf '  %s\n' "${flagged[@]}"
echo
echo "Adding tests is fine; changing or deleting existing ones needs a reviewer's eye."
exit 1
