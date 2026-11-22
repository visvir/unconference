#!/usr/bin/env bash
# Stop hook — the checker in the loop.
# When Claude tries to end its turn, run verify. If it fails, block the stop and
# hand the failure back so Claude keeps fixing (write → check → repair).
#
# Guards:
#  - skips when nothing changed since the last passing verify (chat-only turns stay fast)
#  - skips on the re-entry pass (stop_hook_active) so it can never loop forever
#  - HACKATHON_NO_VERIFY=1 turns it off

set -uo pipefail
input=$(cat)
[[ "${HACKATHON_NO_VERIFY:-0}" == "1" ]] && exit 0
[[ "$(echo "$input" | jq -r '.stop_hook_active // false')" == "true" ]] && exit 0

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
mkdir -p .hackathon

# Fingerprint of the working tree: tracked diff + untracked file list + HEAD
fp=$( { git rev-parse HEAD 2>/dev/null; git diff HEAD 2>/dev/null; git ls-files --others --exclude-standard; } | shasum | cut -d' ' -f1 )
stamp=".hackathon/last-pass-$(pwd | shasum | cut -c1-8)"
[[ -f "$stamp" && "$(cat "$stamp")" == "$fp" ]] && exit 0

# (no `timeout` on stock macOS — the hook's own timeout in settings.json caps this)
out=$(scripts/verify.sh --quiet 2>&1); code=$?
if [[ $code -eq 0 ]]; then
  echo "$fp" > "$stamp"
  exit 0
fi

jq -n --arg r "scripts/verify.sh failed. Fix this before finishing (or tell the user why it can't be fixed now):
$out" '{decision: "block", reason: $r}'
exit 0
