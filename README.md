# ACL Co-pilot

AI post-ACL recovery co-pilot for India. After ACL reconstruction most patients rehab unsupervised for
9–12 months. Your phone camera watches your squat like a physio would, and a daily Hinglish check-in
turns into a safe plan for today.

**Demo:** https://unconference-ruby.vercel.app (offline-safe demo mode: `?demo=1`)

## The flow

1. **Home:** seeded patient (hamstring graft, 10 weeks post-op), knee-flexion trend, today's plan.
2. **Form check:** upload a 3–5 s single-leg squat. The browser takes 8 frames, each tagged with its timestamp.
   Claude (vision) rates knee valgus, trunk lean and pelvic drop 0–3 with a timestamp and 2 coaching cues.
   Tap a chip to jump the video to that moment. If the leg isn't visible, it asks for a re-record.
3. **Check-in:** type how the knee feels (English/Hinglish) and pick swelling: less / same / more.
4. **Safety first:** a deterministic red-flag check (calf pain, fever, wound discharge, locking, giving way,
   chest pain/breathlessness, in English and Hinglish) shows a full-screen "Contact your surgeon today" and stops.
5. **Plan:** a fixed rule decides: *load increased yesterday AND (swelling more OR any severity ≥ 2) → deload*.
   Claude only writes a 2-sentence explanation in the patient's own language.

## How it works

- `app/api/audit`: Claude Opus 5.5, image input, structured output (`messages.parse` + Zod schema).
- `lib/rules.ts`: red flags and the deload rule. Plain TypeScript, tested by `npm test` against `data/test-cases.json`.
- `app/api/explain`: Claude Sonnet 5.5 writes the explanation. It cannot change the decision.
- Demo mode (`?demo=1`): sample clips → real responses cached in `data/cache/` (refresh with `scripts/cache-audit.sh <id>`).

## Tools used

Next.js 16, TypeScript, Tailwind CSS 4, Recharts, Zod, Anthropic SDK (Claude Opus 5.5 + Sonnet 5.5), Vercel,
ffmpeg (for caching sample frames), Claude Code (pair programming). Sample clips: Pexels (see `public/samples/CREDITS.md`).

## What's mocked

- The patient profile, ROM history and today's plan are **seeded** (`data/patient.json`); there's no login and no database.
- Sample videos are **stock footage**, not patients.
- Surgeon and physio names are placeholders.
- `?demo=1` serves **cached** model responses (recorded from real calls) for the bundled samples and the scripted check-in, so there's no model latency on stage. Anything else typed or uploaded goes to Claude live.

All output is framed as observations to discuss with a physio or surgeon, not a diagnosis.
