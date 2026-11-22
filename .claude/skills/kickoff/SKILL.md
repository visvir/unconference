---
name: kickoff
description: Use when planning the idea before the build (12:00–1:00 PM, while registering the problem statement), at the 1:00 PM start, or when the user says "kickoff", "let's start", or describes the idea for the first time. Turns an idea into DEMO.md, a chosen stack, and a deployed skeleton by about 1:50 PM.
---

# Kickoff

Two parts, because the rules allow **ideas before 1:00 PM but not code**.

## Part A: before 1:00 PM (planning only, no product code)

1. **Grill, time-boxed (≤ 10 min).** One question at a time, at most ~6 questions, and only ones
   whose answer changes what gets built:
   - What's the problem, and who exactly is the **one user** who has it?
   - What's the single flow, and what's the "wow" moment in it?
   - What does the **AI** do that plain code couldn't? ("Use of AI" is judged.)
   - What's riskiest (unknown API, model quality, latency, data)?
   - What can be mocked (auth, data, payments)? It must be said out loud in the demo.
   When the user says "just pick", propose and move on.
2. **Draft `DEMO.md`**: problem statement, one line, the one flow as a 3-minute script, the
   judging checklist, 3–6 eval cases, riskiest piece, cut list. Show it in ≤ 15 lines.
3. Give the user a **problem statement** (2–3 sentences) to paste when they register on
   the platform **by 1:00 PM**. Registering also unlocks the partner credits.
4. **Pick the stack**: the most boring web stack the user knows that deploys to a public URL in
   one command (for example Next.js or Vite on Vercel, or a Replit deployment). Writing the stack down is fine.
   Don't scaffold yet.

## Part B: 1:00 PM onwards (clock running)

1. `scripts/clock.sh start 240` if `⏱` says it isn't running.
2. Scaffold. Fill in the `Stack` line in `CLAUDE.md` (run, deploy, demo link).
3. **Riskiest piece first**, along the thinnest end-to-end path.
4. **Deploy now**, even if it's ugly. Put the URL in `SMOKE_URL` in `.hackathon/env` (ask the
   user to add API keys there themselves; never echo secrets). Use the host's env-var settings
   for production keys and never commit them.
5. Copy `evals/run.sh.example` → `evals/run.sh`, `chmod +x`, write the first 1–2 cases.
6. `scripts/verify.sh` green → commit → tell the user the skeleton is live, with the link.

No design doc or plan file. `DEMO.md` is the whole spec.
