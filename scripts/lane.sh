#!/usr/bin/env bash
# lane.sh — one Claude session per area of the project, each in its own git worktree.
# (Pattern from the Opus 4.7 winners: separate sessions = clean context per area.)
#
#   scripts/lane.sh new <name> "<brief>"   create worktree ../unconference-<name> on branch lane/<name>
#   scripts/lane.sh list                   show lanes
#   scripts/lane.sh merge <name>           verify the lane, then merge it into the current branch
#   scripts/lane.sh rm <name>              remove the worktree (keeps the branch)
#
# Keep it to 2–3 lanes in a 2-hour build; merging costs more than it saves beyond that.

set -euo pipefail
ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
REPO=$(basename "$ROOT")

cmd=${1:-list}; name=${2:-}
dir="$ROOT/../$REPO-$name"

case "$cmd" in
  new)
    [[ -n "$name" ]] || { echo "usage: $0 new <name> \"<brief>\""; exit 2; }
    brief=${3:-"Work on the $name area. See DEMO.md."}
    git worktree add -b "lane/$name" "$dir"
    # share the clock + env so every lane sees the same time box
    mkdir -p "$ROOT/.hackathon"
    ln -sfn "$ROOT/.hackathon" "$dir/.hackathon"
    cat > "$dir/LANE.md" <<EOF
# Lane: $name

$brief

Rules: stay inside this lane's files where you can. Run \`scripts/verify.sh\` before
saying you're done. Commit small and often on branch \`lane/$name\`.
EOF
    echo
    echo "Lane ready. In a new terminal:"
    echo "  cd \"$dir\" && claude \"Read LANE.md and DEMO.md, then start.\""
    ;;
  list)
    git worktree list
    ;;
  merge)
    [[ -n "$name" ]] || { echo "usage: $0 merge <name>"; exit 2; }
    (cd "$dir" && scripts/verify.sh --quiet) || { echo "Lane '$name' fails verify — fix it before merging."; exit 1; }
    git merge --no-ff "lane/$name" -m "Merge lane $name"
    scripts/verify.sh --quiet && echo "✔ merged and verified"
    ;;
  rm)
    [[ -n "$name" ]] || { echo "usage: $0 rm <name>"; exit 2; }
    git worktree remove "$dir"
    ;;
  *) echo "usage: $0 new|list|merge|rm"; exit 2 ;;
esac
