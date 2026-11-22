#!/usr/bin/env bash
# verify.sh — the one command that says "is the project still working?"
#
# Stack-agnostic: detects what exists and runs only that.
#   Node:    npm run lint / typecheck / test / build   (whichever scripts exist)
#   Python:  ruff (if installed) + pytest (if tests exist), via uv when uv.lock exists
#   Evals:   evals/run.sh                               (if present)
#   Smoke:   curl $SMOKE_URL                            (if set, e.g. in .hackathon/env)
#
# Usage:  scripts/verify.sh            run everything
#         scripts/verify.sh --quiet    only print failures (used by the Stop hook)
# Exit code 0 = all checks passed (or nothing to check yet).

set -uo pipefail
cd "$(dirname "$0")/.."

QUIET=0; [[ "${1:-}" == "--quiet" ]] && QUIET=1
[[ -f .hackathon/env ]] && source .hackathon/env

FAILED=()
RAN=0
LOG_DIR=.hackathon/verify-logs
mkdir -p "$LOG_DIR"

say() { [[ $QUIET -eq 0 ]] && echo "$@"; return 0; }

# run <name> <command...> — runs a check, keeps output short, records failures
run() {
  local name="$1"; shift
  local log="$LOG_DIR/$name.log"
  RAN=$((RAN + 1))
  say "▶ $name: $*"
  if "$@" >"$log" 2>&1; then
    say "  ✔ $name"
  else
    FAILED+=("$name")
    echo "  ✘ $name failed — last 30 lines ($log):"
    tail -n 30 "$log" | sed 's/^/    /'
  fi
}

# ── Node ────────────────────────────────────────────────────────────────
if [[ -f package.json ]]; then
  # Parse once. A broken package.json must FAIL verify, not silently skip every check.
  if ! scripts_list=$(node -e '
      const s = JSON.parse(require("fs").readFileSync("package.json","utf8")).scripts || {};
      for (const k of ["lint","typecheck","test","build"])
        if (s[k] && !s[k].includes("no test specified")) console.log(k);' 2>"$LOG_DIR/package-json.log"); then
    RAN=$((RAN + 1)); FAILED+=("package-json")
    echo "  ✘ package.json does not parse:"; grep -m1 -E 'Error' "$LOG_DIR/package-json.log" | sed 's/^/    /'
  else
    [[ -d node_modules ]] || run install npm install --no-audit --no-fund
    for script in $scripts_list; do
      run "npm-$script" npm run --silent "$script"
    done
  fi
fi

# ── Python ──────────────────────────────────────────────────────────────
if [[ -f pyproject.toml || -f requirements.txt ]]; then
  PY=(python3); [[ -f uv.lock ]] && PY=(uv run)
  command -v ruff >/dev/null && run ruff ruff check .
  if compgen -G "tests/*.py" >/dev/null || compgen -G "test_*.py" >/dev/null || compgen -G "**/test_*.py" >/dev/null; then
    run pytest "${PY[@]}" -m pytest -q -x
  fi
fi

# ── Evals (the "eval in the first commit" rule) ─────────────────────────
[[ -x evals/run.sh ]] && run evals evals/run.sh

# ── Smoke test against the running app / deploy ─────────────────────────
[[ -n "${SMOKE_URL:-}" ]] && run smoke curl -fsS --max-time 10 -o /dev/null "$SMOKE_URL"

# ── Secret scan (rule: "don't commit API keys") ─────────────────────────
# Looks at tracked + staged + untracked-not-ignored files for common key shapes.
secret_scan() {
  local hits
  hits=$(git ls-files -co --exclude-standard 2>/dev/null \
    | grep -vE '(^|/)(package-lock\.json|uv\.lock|.*\.example)$' \
    | xargs -I{} grep -lIE 'sk-ant-[A-Za-z0-9_-]{20,}|sk-(proj-)?[A-Za-z0-9]{32,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|AIza[0-9A-Za-z_-]{35}|xox[bp]-[A-Za-z0-9-]{20,}' {} 2>/dev/null)
  [[ -z "$hits" ]] || { echo "Possible API keys in: $hits"; return 1; }
}
git rev-parse --git-dir >/dev/null 2>&1 && run secrets secret_scan

# ── Summary ─────────────────────────────────────────────────────────────
if [[ $RAN -eq 0 ]]; then
  say "ℹ Nothing to verify yet (no package.json, pyproject.toml, evals/run.sh or SMOKE_URL)."
  exit 0
fi
if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo "VERIFY FAILED: ${FAILED[*]}"
  exit 1
fi
say "VERIFY PASSED ($RAN checks)"
exit 0
