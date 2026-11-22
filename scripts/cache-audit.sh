#!/usr/bin/env bash
# Save a REAL audit response for a sample video into data/cache (used by ?demo=1).
# Usage: scripts/cache-audit.sh <sample-id>   (video at public/samples/<id>.mp4, dev server on :3005)
set -euo pipefail
cd "$(dirname "$0")/.."
id=$1; tmp=$(mktemp -d)
python3 -I scripts/frames.py "public/samples/$id.mp4" "$tmp/req.json"
curl -fsS -X POST "${BASE:-http://localhost:3005}/api/audit" -H 'Content-Type: application/json' -d @"$tmp/req.json" > "data/cache/audit-$id.json"
cat "data/cache/audit-$id.json"; echo
