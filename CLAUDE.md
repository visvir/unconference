# Builder's Day speedrun: 4-hour solo build

Product (Un)Conference '26, Builder's Day · Sun 22 Nov · Bengaluru.
**Build 1:00–5:00 PM IST. Submissions lock at 5:00 PM, and nothing gets in after that.**
Every rule below protects one thing: a **public demo link where one user completes one
flow end to end**, submitted before 5.

## You (the builder)

Registered ✅ · mentor check-in 3:00–4:00 PM (zone, room and mentor names kept out of the public repo).

## Ready before 1:00 PM (don't redo these)

- **Vercel**: CLI logged in. This repo is linked to Vercel project `unconference` (`.vercel/`).
  Deploy with `vercel deploy --prod --yes`. Always share the **production** URL (previews need a login).
- **Keys**: `ANTHROPIC_API_KEY` and `SARVAM_API_KEY` in `.env` (gitignored, never read it; both
  verified HTTP 200). Load them locally with `node --env-file=.env` or the framework's `.env` support.
  The **user** pushes them to Vercel (don't pipe secrets yourself):
  `grep '^NAME=' .env | cut -d= -f2- | tr -d '\n' | vercel env add NAME --environment production`.
  Env vars only reach deployments made **after** they're added, so redeploy.
- **npm cache warmed**: Next.js 16 (App Router, TS, Tailwind, `create-next-app --yes`),
  `@anthropic-ai/sdk`, `ai`, `@ai-sdk/anthropic`, `zod`. Next.js is the default stack: it installs fast
  from cache on venue Wi-Fi and deploys to Vercel with zero config.
- **Model**: default to `claude-sonnet-5-5` for app features (fast and cheap); use `claude-opus-5-5`
  only where quality clearly matters. Call it server-side only, never from the browser.
- **Proven pattern**: `../deploy-test/api/hello.js` is a server function that reads the key from
  `process.env` and calls Anthropic. Copy the pattern, not the file.
- **Process plugins are off in this repo** (superpowers, learning style). Don't invoke brainstorming
  or writing-plans skills; `/kickoff` replaces them.

## Event facts (from the Builder's Kit)

- **Submit** at unconference.theproductfolks.com/speedrun/submit: project name, **GitHub
  link**, **demo link**. Submissions open at 4:00 PM.
- **Judges score five things:** (1) it works, (2) problem and user, (3) product sense
  and feasibility, (4) use of AI, (5) the demo.
- **Mentor check-in 3:00–4:00 PM** (mandatory, in zone) is a *first evaluation*:
  have the build open and working by then.
- **Top 10 demo on stage at 6:00 PM:** 3 minutes plus about 1 minute of judges' questions. Judges
  open the demo link **on the stage laptop**. Show it working first, one user and one flow, say
  what's mocked, keep a backup screen recording.
- **Rules:** solo. Any tool, library or template is fine, but **list what you used**. **Say
  what's mocked.** **Know how it works, even if AI wrote it.** Don't put the product behind a
  login, submit slides or mock-ups, or commit API keys. "Have it working by half time." "Commit often."

## The loop (non-negotiable)

1. **`scripts/verify.sh` is the definition of done.** Run it after every meaningful
   change. Never claim something works without having run it. A Stop hook runs it
   automatically and sends failures back to you; fix them, don't argue with them.
   It also scans for committed secrets.
2. **Evals before features.** `evals/run.sh` checks the cases in `DEMO.md`. When a new
   behaviour matters for the demo, add a case first, then make it pass.
3. **Check what you can't test by looking.** For UI work, screenshot it and compare
   against `DEMO.md`. Check the **deployed** link, not just localhost.

## Time box (240 min, clock starts 1:00 PM)

Every prompt starts with a `⏱` line from `scripts/clock.sh`. **Obey the phase.**

| Phase | Minutes | Clock time | What to do |
|---|---|---|---|
| kickoff | 0–15 | 1:00–1:15 | `DEMO.md` was drafted 12–1 (ideas are allowed, code isn't). Pick the stack, scaffold. |
| skeleton | 15–50 | 1:15–1:50 | Thinnest end-to-end path, riskiest piece first, **deployed to a public URL**. Commit. |
| build | 50–120 | 1:50–3:00 | The one core flow, working on the live link **before the mentor arrives**. |
| mentor | 120–180 | 3:00–4:00 | Show it to the mentor. Iterate on their feedback, improve the "use of AI" and the flow's polish. |
| freeze | 180–215 | 4:00–4:35 | `/freeze`: no new features. README (tools used + what's mocked), test the link on a phone. |
| submit | 215–225 | 4:35–4:45 | `/freeze` submit step: final verify, push, **submit**. Aim for 4:45 and leave 15 min of buffer. |
| buffer | 225–240 | 4:45–5:00 | Only demo-breaking fixes, re-pushed. Nothing risky. |
| after lock | 240+ | 5:00–6:00 | Code is locked. Rehearse the 3-minute demo, record a backup, prep for the questions. |

If the user asks for a new feature during freeze or later, say so in one line and ask
whether to cut something else for it.

## How to build here

- **One user, one flow, end to end.** "A small slice that works beats a big plan."
- **Riskiest, least-proven piece first** (the API you've never called, the model
  that might be too slow). If it fails, we learn at 1:30, not 3:30.
- **Deploy early, redeploy often.** The demo link is what gets judged. No login screen.
- **Use AI where it makes the product better.** "Use of AI" is scored, so the model should do the
  core job, not decoration. Deterministic code checks anything that must be right.
- **Boring, well-known stack.** One repo, one deploy, seeded data, hard-coded config.
- **Small commits** after every green verify. `main` must always be demoable and pushed.
- **Audit before the next feature.** Re-read `DEMO.md` and check that what's built still matches.
- **Keep the ceremony small.** No design docs or plans beyond `DEMO.md`. If a process skill
  wants a multi-step approval flow, skip it and say so. The clock wins.
- **Mocked = said out loud.** Anything faked goes in README's "What's mocked" as soon as it's faked.
- **Explain as you go.** The user must be able to answer "how does this work?" from judges.
  Give a one-line "how it works" note after each significant piece.
- Keep replies short. The user reads them between building.

## Files

| Path | Purpose |
|---|---|
| `DEMO.md` | The demo script, eval cases and judging criteria: the spec. Keep it current. |
| `README.md` | What it is, the demo link, how it works, **tools used**, **what's mocked**. |
| `scripts/verify.sh` | Detects the stack, runs lint/typecheck/test/build, evals, smoke check, secret scan. |
| `scripts/clock.sh` | `start [min]` / `status`. Drives the phase. |
| `scripts/lane.sh` | Parallel sessions in git worktrees (`new`, `merge`, `list`, `rm`). |
| `evals/run.sh` | Runs the demo's eval cases; exit 1 on any failure. |
| `.hackathon/env` | Secrets and `SMOKE_URL` (gitignored, never read into chat). |

## Stack

Next.js 16 App Router + TS + Tailwind 4 + Recharts; Claude Opus 5.5 (vision audit) + Sonnet 5.5 (explanation).
Run: `npx next dev -p 3005` · Test: `npm test` (rules) · Deploy: `vercel deploy --prod --yes` · Demo link: https://unconference-ruby.vercel.app (`?demo=1` = cached, offline-safe)
