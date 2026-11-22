---
name: freeze
description: Use when the clock reaches the freeze phase (4:00 PM), or the user says "freeze", "wrap up", "submit", "are we demo ready", or "prep the demo". Stops feature work, gets a verified submission in before the 5:00 PM lock, then preps the 3-minute stage demo.
---

# Freeze → submit → demo

Submissions lock at **5:00 PM**. Target submit time is **4:45**. From freeze on, the only
goal is that the one flow in `DEMO.md` works on the **public demo link**.

## 1. Freeze (4:00–4:35)

1. **Merge or drop lanes** (`scripts/lane.sh list`). Unmerged work is cut.
2. **Audit.** Dispatch the `demo-critic` subagent against the deployed link. Meanwhile
   run `scripts/verify.sh`.
3. **Triage**: fix only what breaks or embarrasses the flow. Everything else goes on the cut list.
   If a step can't be fixed in about 10 minutes, change the demo to avoid it (pre-seed, hard-code,
   skip) and **add it to "What's mocked"**.
4. **README.md** (required by the rules): one line, **demo link**, screenshot, how it works in
   3–5 lines, **Tools used** (libraries, templates, AI tools, and this harness), **What's mocked**.
5. Ask the user to **open the demo link on their phone**, with no login and data visible.

## 2. Submit (4:35–4:45)

1. `scripts/verify.sh` green (includes the secret scan). Commit, then `git push` (ask the user before pushing).
2. Check that the GitHub repo is **public** (or accessible to judges) and that the demo link loads in
   a private window.
3. Give the user the three fields to paste at
   unconference.theproductfolks.com/speedrun/submit: **project name, GitHub link, demo link**.
   The user submits it themselves.
4. Between 4:45 and 5:00, push only fixes for things that break the demo.

## 3. After the lock (5:00–6:00): demo prep, no code

- Write the 3-minute script as spoken lines from `DEMO.md`: working product first, one user,
  one flow, say what's mocked.
- Rehearse with a timer at least twice. Cut until it's under 2:45.
- **Backup screen recording** of a clean run.
- Prep answers for the likely questions in `DEMO.md`, especially "how does it work?" (the rules say
  you must know, even if AI wrote it). Walk the user through the architecture in 5 lines.
- Top 10 is announced at 5:50. Be at the stage area by 5:55 and check the link opens on the stage laptop.
