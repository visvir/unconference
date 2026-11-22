# ACL Co-pilot

AI post-ACL recovery co-pilot for India. After ACL reconstruction most patients rehab unsupervised for
9–12 months. Your phone camera watches your squat like a physio would, and a daily Hinglish check-in
turns into a safe plan for today.

**Demo:** https://unconference-ruby.vercel.app (`?demo=1`: no model latency, cached model responses; the site still needs a network)

## The flow

1. **Home:** seeded patient (hamstring graft, 10 weeks post-op), knee-flexion trend, today's plan.
2. **Form check:** upload a 3–5 s two-leg bodyweight squat, filmed from the front. The browser takes 8 frames, each tagged with its timestamp.
   Claude Opus 5.5 (medium effort, vision) rates knee valgus, trunk lean and pelvic drop 0–3 with a timestamp and 2 coaching cues.
   Tap a chip to jump the video to that moment. If the leg isn't visible, it asks for a re-record.
3. **Check-in:** type how the knee feels (English/Hinglish) and pick swelling: less / same / more.
4. **Safety first:** a deterministic red-flag check (calf pain, fever, wound discharge, locking, giving way,
   chest pain/breathlessness, in English and Hinglish) shows a full-screen "Contact your surgeon today" and stops.
5. **Plan:** a fixed rule decides: *load increased yesterday AND (swelling more OR any severity ≥ 2) → deload*.
   Claude only writes a 2-sentence explanation in the patient's own language.

### Also in the app

- **Voice check-in:** "Speak instead" records in the browser and sends the audio to Sarvam speech-to-text. The text lands in the box for the patient to review before submitting.
- **10-minute plan:** "Only 10 minutes today?" on the plan card shows a shorter session. A fixed rule, no AI.
- **This week:** Home shows "4 of 6 sessions done, missed Tue, Thu" (seeded).
- **My recovery** (`/progress`): five typical rehab phases ("You are here"), past sessions, and "Share with my physio" (email or WhatsApp, message built by plain code).
- **Knee bend from a photo** (`/rom`): one side-on photo, Claude Opus 5.5 estimates knee flexion ("About N°, estimate ±10°"). It can be added to the chart as "Today".

## How it works

- `app/api/audit`: Claude Opus 5.5, image input, structured output (`messages.parse` + Zod schema).
- `lib/rules.ts`: red flags and the deload rule. Plain TypeScript, tested by `npm test` against `data/test-cases.json`.
- `app/api/explain`: Claude Sonnet 5.5 writes the explanation. It cannot change the decision.
- `app/api/transcribe` + `components/VoiceInput.tsx`: browser audio to Sarvam `saaras:v4`, translit mode, so Hindi/Hinglish comes back in Roman script and the red-flag check still works.
- `shortPlan` in `lib/rules.ts` + `components/QuickPlan.tsx`: keeps the most protective exercises first within 10 minutes; never restores exercises a deload removed.
- `app/progress` + `lib/summary.ts` + `components/ShareProgress.tsx`: the physio message is built from the data by plain code; `mailto:` and `wa.me` links open the patient's own app. The physio's email and number are kept in the browser's localStorage only.
- `app/rom` + `app/api/rom` + `lib/rom.ts`: photo downsized in the browser, Claude Opus 5.5 (medium effort, structured output); code clamps and rounds to 5°. "Today" value is kept in sessionStorage.
- Demo mode (`?demo=1`): sample clips → real responses cached in `data/cache/` (refresh with `scripts/cache-audit.sh <id>`).

## Tools used

Next.js 16, TypeScript, Tailwind CSS 4, Recharts, Zod, Anthropic SDK (Claude Opus 5.5 + Sonnet 5.5), Sarvam speech-to-text (saaras:v4), Vercel,
ffmpeg (for caching sample frames), Claude Code (pair programming). Sample clips: Pexels (see `public/samples/CREDITS.md`).

## What's mocked

- The patient profile, ROM history and today's plan are **seeded** (`data/patient.json`); there's no login and no database.
- Sample clips: three samples, two stock clips from Pexels (wrong angle, clean squat) and the founder's own knee-caves-in squat recorded at the venue; their Claude responses are saved from real calls.
- Surgeon and physio names are placeholders.
- `?demo=1` serves **cached** model responses (recorded from real calls) for the bundled samples and the scripted check-in, so there's no model latency on stage. Anything else typed or uploaded goes to Claude live.
- The week strip ("4 of 6 sessions") and the five rehab phases are seeded or typical, not computed from real use.
- The knee-bend sample photo is a frame from a stock squat clip. It reads about 90°.
- Sharing opens your own mail app or WhatsApp with the message ready. The app sends nothing.
- Voice and photo estimates are not validated. Voice was tested only with computer-generated speech; the photo estimate was not checked against a goniometer.

All output is framed as observations to discuss with a physio or surgeon, not a diagnosis.
