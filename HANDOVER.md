# Handover / restart file

Updated after the event (security and privacy pass). Earlier: 4:05 PM (earlier checkpoint 3:10 PM (originally written **2:07 PM IST, Sun 22 Nov**, 66 min into the 240-min build)). Read this first after
logging in again. Then read `CLAUDE.md` (rules), `DEMO.md` (spec + stage script) and `README.md`.

## Where we are (one paragraph)

**ACL Co-pilot**, an AI post-ACL rehab co-pilot for India. The core flow is **live and verified** at
https://unconference-ruby.vercel.app (demo mode: `?demo=1`): home (seeded patient Arjun, ROM chart) → two-leg squat
video form check (two samples: Wrong angle, Clean squat; the founder's "Knee caves in" clip was removed for privacy) (the browser extracts 8 frames → Claude Opus 5.5 structured output) → Hinglish check-in →
deterministic red-flag stop OR deterministic deload rule + Claude Sonnet 5.5 two-sentence explanation.
New and deployed: voice check-in (Sarvam), 10-minute plan, week strip on Home, My recovery page with share to physio (email/WhatsApp), and knee bend from a photo (`/rom`).
`scripts/verify.sh` was green against production at the earlier checkpoint (47 evals).

**Since the mentor review (about 3:45 PM), on branch `design-refresh` (commit 32ede3e or later), NOT yet on main or the live site unless a later line says so:**
- Physio's advice (`/notes`): pasted text or PDF, Claude Sonnet 5.5 extracts instructions, `applyNotes` applies them; deload still wins.
- Live squat coach (`/live`, beta): in-browser MediaPipe pose, tested cue logic in `lib/pose.ts`.
- Activity widget on Home: sample data only.
- Redesign "ink + volt on paper" (`DESIGN.md`) and the Check my progress hub (`/check`).
- Local result: 59 evals and all unit tests pass.
- Tags: `demo-safe-4` = live site before the redesign; `checkpoint-redesign` = redesign before the mentor features.

## Timeline (founder's targets)

| When | What |
|---|---|
| now → 2:45 | Founder taps through the live link; `demo-critic` pass. |
| 2:45 → 3:15 | `demo-critic` agent walks the prod link; fix only what breaks. Rehearse with a timer, record a backup video. |
| **3:30** | **Mentor review** (first evaluation). |
| 3:45 → 4:30 | Fix only what the mentor flags. README pass. Phone test. |
| **4:45** | **Submit** at unconference.theproductfolks.com/speedrun/submit (name, GitHub link, demo link). Lock is 5:00. |

## Open items

1. Owner: set `DEMO_ACCESS_CODE` (at least 12 characters) on Vercel and redeploy. Until then the public site refuses all live analysis; samples still work. Unlock at `/unlock`.
2. Owner: remove the leftover `PHYSIO_WHATSAPP` setting on Vercel: `vercel env rm PHYSIO_WHATSAPP production --confirm-name PHYSIO_WHATSAPP`. It holds only a placeholder. The CLI needs a human to confirm.
3. Decision pending: rewrite git history to purge the removed clip, the mentors' names and the commit email from old commits. It needs a force-push and re-creating tags.
4. Decision pending: delete old Vercel deployments. They are behind a Vercel login, not public.
5. Owner: set a monthly spend limit in the Anthropic Console.

OneDrive note: a local `next build` can fail with ENOTEMPTY or ETIMEDOUT on a `.next/server 2` conflict folder that OneDrive creates. This is not a code error. Vercel builds are unaffected.

## Restart steps (after logging in with the Console account)

```bash
cd ~/Library/CloudStorage/OneDrive-Personal/AI/unconference
claude --continue          # resumes this conversation; if it starts fresh, say: "read HANDOVER.md and continue"
```
In the new session:
1. `/status`: confirm it's billing the Console org (the $100 hackathon credits). `/model opus` (or `/model fable` on credits).
2. `scripts/clock.sh status`: the build clock keeps running from 1:00 PM (it's stored in `.hackathon/clock`).
3. `scripts/verify.sh`: should print `VERIFY PASSED`.
4. `git status && git log --oneline -5`: the checkpoint commit should be the latest.
5. Recreate the helper agents (agents don't survive a restart; prompts below).

**Credits note:** the deployed app and Claude Code now draw on the **same** Console balance (~$99.7 at
checkpoint). Set a spend limit on a separate Console workspace for Claude Code so the demo key can't run dry.
Rough cost: demo audit ≈ $0.06 (Opus) per call; a Fable Claude Code session ≈ $10 typical.

## Helper agents to recreate (all background, all report to the main session)

| Agent | Role | Rules |
|---|---|---|
| **Pre-commit code reviewer** | Reviews `git diff` before every commit: demo-breaking bugs, secrets, mobile issues | Read-only; reports BLOCKERS / RISKS / CLEAR TO COMMIT in ≤ 150 words |
| **Evals owner** | Keeps `evals/run.sh` + `scripts/test-rules.ts` covering ONLY the agreed flow | May edit only `evals/`, `scripts/test-rules.ts`, `data/test-cases.json`, DEMO.md eval table; reports app bugs instead of fixing them |
| **ACL physio expert (20+ yrs)** | Gatekeeps clinical content | Feedback goes **to the founder only**; never act on it without the founder's OK |
| **demo-critic** (built-in agent type) | Walks DEMO.md against the prod link | Read-only; run before 3:30 and at freeze |

## Working agreements (the founder's instructions)

- **Tight scope:** "do one thing extremely well". No feature creep; new features after 4:00 need a cut.
- **Red/green TDD for bugs:** write the failing test/eval first, show it fail, fix, show it pass.
- **Review → fix → verify green → commit → deploy** without asking (the founder pre-approved deploys after review).
- Keep docs (DEMO.md, README.md, this file) updated and committed as we iterate.
- Never read `.env` / `.env.local` / `.hackathon/env`. The founder pushes env vars to Vercel themselves.

## Key facts for answering judges

- **The AI observes and explains; deterministic code decides.** Red flags (`lib/rules.ts`) run before any model call.
  The deload rule: load increased yesterday AND (swelling more OR any severity ≥ 2).
- **Vision:** 8 timestamped 480 px JPEG frames (~300 KB in total, whatever the original video size; a 4K60 HEVC 50 MB clip → 1.7 s
  extraction) → `messages.parse` + Zod schema on `claude-opus-5-5` (forced tool_choice isn't supported on Opus 5.5).
- **Demo mode** serves real recorded responses from `data/cache/`. The explanation cache only answers the scripted
  example text; anything typed goes live.
- **What's mocked:** the seeded patient/history, two stock clips, placeholder surgeon/physio, no login/DB.

## Stack and commands

Next.js 16 App Router + TS + Tailwind 4 + Recharts + Zod + `@anthropic-ai/sdk`. Vercel project `unconference`
(`vercel.json` pins `framework: nextjs`; the project preset was "Other"). Env on Vercel: `ANTHROPIC_API_KEY`, `SARVAM_API_KEY` and `DEMO_ACCESS_CODE` (production; the last must be set by the owner, see open items).
- Dev: `npx next dev -p 3005` · Rules: `npm test` · Evals: `evals/run.sh` (prod) / `BASE=http://localhost:3005 evals/run.sh` / `EVAL_LIVE=1` (real model calls)
- Deploy: `vercel deploy --prod --yes` · Cache a sample: `scripts/cache-audit.sh <id>`
