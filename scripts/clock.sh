#!/usr/bin/env bash
# clock.sh — the hackathon time box.
#
#   scripts/clock.sh start [minutes]   start the clock (default 240 min)
#   scripts/clock.sh status            print elapsed time + current phase
#   scripts/clock.sh reset             clear the clock
#
# The UserPromptSubmit hook calls `status` so Claude always knows the time.

set -uo pipefail
cd "$(dirname "$0")/.."
STATE=.hackathon/clock
mkdir -p .hackathon

# phase <elapsed_minutes> <total_minutes>
# Prints ONE line: the phase name and what Claude should (and should not) be doing.
# This line is injected into every prompt, so it directly steers Claude's behaviour.
phase() {
  local elapsed=$1 total=$2
  # Mirrors the "Time box" table in CLAUDE.md (Builder's Day: 240 min from 1:00 PM).
  # Boundaries are shares of $total (whole-number %), so a shorter event still scales.
  # Each line is an instruction, because Claude reads it on every prompt.
  local pct=$(( elapsed * 100 / total ))
  if   (( pct <   6 )); then echo "KICKOFF: finalise DEMO.md, pick the stack, scaffold. Riskiest piece next."
  elif (( pct <  21 )); then echo "SKELETON: thinnest end-to-end path, riskiest piece first, DEPLOY to a public URL now."
  elif (( pct <  50 )); then echo "BUILD: make the one core flow work on the live link before the mentor check-in (half time)."
  elif (( pct <  75 )); then echo "MENTOR: show the build, act on feedback, strengthen 'use of AI' and polish the flow. No new flows."
  elif (( pct <  90 )); then echo "FREEZE: no new features. /freeze, fix demo-breakers only, write README (tools used + what's mocked)."
  elif (( pct <  94 )); then echo "SUBMIT NOW: verify, push, hand the user project name + GitHub link + demo link."
  elif (( pct < 100 )); then echo "BUFFER: submitted? Only push fixes for things that break the demo. Nothing risky."
  else                       echo "LOCKED: submissions are closed. No code changes. Rehearse the 3-min demo, record a backup, prep judge Q&A."
  fi
}

case "${1:-status}" in
  start)
    total=${2:-240}
    echo "$(date +%s) $total" > "$STATE"
    echo "⏱  Clock started: $total minutes. Ends at $(date -v+"${total}"M +%H:%M 2>/dev/null || date -d "+$total min" +%H:%M)."
    ;;
  status)
    [[ -f $STATE ]] || { echo "⏱  Clock not started (run scripts/clock.sh start)."; exit 0; }
    read -r start total < "$STATE"
    elapsed=$(( ( $(date +%s) - start ) / 60 ))
    left=$(( total - elapsed ))
    echo "⏱  ${elapsed}m elapsed, ${left}m left of ${total}m — $(phase "$elapsed" "$total")"
    ;;
  reset)
    rm -f "$STATE"; echo "⏱  Clock cleared."
    ;;
  *) echo "usage: $0 start [minutes] | status | reset"; exit 2 ;;
esac
