---
name: lanes
description: Use during the build phase when the work splits into 2–3 independent areas (e.g. frontend / backend / AI pipeline) that could proceed in parallel Claude sessions. Also when the user says "parallelize", "split this up", or "lanes".
---

# Lanes: parallel sessions, one per area

Winners ran one Claude session per area so each kept a clean context. In a
2-hour build this only pays off when the areas barely touch each other.

## Decide

Split only if **all** hold:
- the skeleton is running and committed on `main`
- there are 2–3 areas that touch mostly different files
- the interface between them is settled (API shape, data format), so write it down
  in `DEMO.md` under "Interfaces" first

Otherwise say "staying single-lane" with the reason and keep going.

## Do

1. For each lane: `scripts/lane.sh new <name> "<2–3 line brief: goal, files it owns,
   interface it must respect, which DEMO.md eval cases it makes pass>"`.
2. Give the user the printed `cd … && claude …` commands to paste into new terminals.
   This session stays the **integrator**: it doesn't build features, it merges.
3. When a lane reports done: `scripts/lane.sh merge <name>` (it verifies before and
   after). On conflict, resolve toward what `DEMO.md` says, re-run verify.
4. At freeze, merge or abandon every lane. Unmerged work doesn't exist.
