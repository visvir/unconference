#!/usr/bin/env bash
# Runs every scripts/test-*.ts (rules, summary, and any feature tests). Exit 1 if any fails.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
for f in scripts/test-*.ts; do
  node --experimental-strip-types --no-warnings "$f" || fail=1
done
exit $fail
