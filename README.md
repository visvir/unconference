# unconference

> _Project name: one line saying who it's for and what it does._ Built solo in 4 hours at
> Product (Un)Conference '26 Builder's Day, Bengaluru, 22 Nov 2026.

**Demo:** _https://… (public, no login)_

_Screenshot_

## How it works

_3–5 lines: what the user does, what the AI does, what checks the AI's output._

## Run it

```bash
# filled in at kickoff
```

## Tools used

- **AI tools:** Claude Code (Claude Opus 5.5)
- **Build harness (tooling, no product code):** `CLAUDE.md`, `scripts/verify.sh`,
  `scripts/clock.sh`, `scripts/lane.sh`, `.claude/` skills, hooks and agents, prepared before the event
- **Libraries / templates:** _…_
- **APIs / models:** _…_

## What's mocked

- _Anything faked, hard-coded or seeded. Add it here as soon as it's faked._

---

<details>
<summary>The harness (how this was built)</summary>

| Path | Purpose |
|---|---|
| `CLAUDE.md` | Rules and time box for Claude Code |
| `DEMO.md` | The demo script, eval cases and judging checklist: the spec |
| `scripts/verify.sh` | One command: lint, typecheck, test, build, evals, smoke check, secret scan |
| `scripts/clock.sh` | 4-hour time box; the current phase goes into every prompt |
| `scripts/lane.sh` | Parallel Claude sessions in git worktrees |
| `.claude/hooks/stop-verify.sh` | Runs verify when Claude finishes; failures go back to Claude |
| `.claude/skills/` | `/kickoff`, `/lanes`, `/freeze` |
| `.claude/agents/demo-critic.md` | Independent reviewer scoring the build on the judging criteria |

</details>
