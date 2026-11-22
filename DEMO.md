# Demo

## Problem statement

After ACL reconstruction, patients in India are mostly unsupervised for 9–12 months of rehab. They
progress load on their own, miss form compensations (knee caving in, leaning away from the leg) and
don't know when a swollen knee means "back off" versus "call the surgeon". ACL Co-pilot turns the phone
camera into a physio watching your form, and turns a daily Hinglish check-in into a safe plan for today.

## One line

For a patient months into unsupervised ACL rehab: film one squat and say how the knee feels, and get a
form check, a safe plan for today, and a brief to send your surgeon.

## The one flow (3 min + ~1 min Q&A)

1. (0:00) Arjun, 10 weeks after a hamstring-graft ACL reconstruction. Home: flexion 104°→123°; yesterday he progressed to single-leg squats.
2. (0:30) He uploads a 4-second single-leg squat. Claude (vision, ~8 frames) flags knee valgus at 2.1 s, severity 2, with 2 coaching cues. Tap the chip and the video seeks to that moment.
3. (1:15) Check-in: "Kal squats badhaye the, aaj knee thoda swollen aur stairs pe khichav", swelling: more.
4. (1:45) The red-flag check passes. The **deterministic rule** fires: load up yesterday + swelling more → deload. Single-leg squats and bike dropped; heel slides, quad sets, SLR, ice + elevation kept. Claude explains why in Hinglish.
5. (2:15) Surgeon Brief → PNG → WhatsApp.
6. (2:40) Red flag: "calf mein dard aur sujan hai" → full screen "Contact your surgeon today".
Mocked: the patient profile and history are seeded; no login; the surgeon's WhatsApp number is a demo number.

## Judging checklist

| Criterion | How this build earns it |
|---|---|
| It works | Full loop on the public link, no login; `?demo=1` runs offline from cached responses |
| Problem and user | Founder is 15 months post-ACL; unsupervised rehab is the norm in India |
| Product sense and feasibility | AI observes and explains; deterministic rules decide; red flags always escalate |
| Use of AI | Vision form audit over frames, Hinglish understanding, explanation in the patient's language |
| Demo | Script above, cached demo mode, backup recording |

## Eval cases

`evals/run.sh` (run by `scripts/verify.sh`; `BASE=` to target localhost; ~6 s). `EVAL_LIVE=1` adds real model calls (~15 s).

| # | Input | Expected | Check |
|---|---|---|---|
| 1 | GET /, /audit, /checkin | 200; "Knee bend" + "Arjun", "Squat form check", "How's the knee today" + "Hinglish" | contains |
| 2 | each sample in `lib/flow.ts` | `/samples/<id>.mp4` served, `data/cache/audit-<id>.json` exists | status / file |
| 3 | POST /api/audit `{"sample":"reference"}` | contract (usable bool, findings type/severity 0–3/timestamp/exactly 2 cues), 3 findings all ≤ 1, cached | node JSON |
| 4 | POST /api/audit `{"sample":"sideon"}` | `video_usable:false`, re-record reason, no findings | node JSON |
| 5 | POST /api/audit `{"sample":"valgus"}` (if cached) | knee_valgus severity ≥ 2; WARN if the cache is missing | node JSON |
| 6 | /api/audit unknown sample / 0 frames / 13 frames | 404 / 400 / 400 with `error` | status |
| 7 | POST /api/explain `demo:true, decision:"deload"` | non-empty cached explanation, no markdown | node JSON |
| 8 | rules: 14 scenarios in `data/test-cases.json` | proceed / deload / red flag as labelled (incl. unusable video ignored, no-load-up → proceed) | `npm test` |
| 9 | rules: exact demo check-in, seeded patient | no red flag; deload with or without audit; keeps only heel slides, quad sets, SLR, ice; single-leg squats removed | `npm test` |
| 10 | rules: red flags, every category, English + Hinglish (29 phrases) | hit with the right label; every category in `lib/rules.ts` has a test; negation still escalates | `npm test` |
| 11 | rules: 14 normal rehab phrases (calf raises, khichav, block/clock…) | no false alarm; known false alarms/misses print ⚠ | `npm test` |
| 12 | LIVE: frames of reference.mp4 → /api/audit | usable, one finding per type, all ≤ 1 | `EVAL_LIVE=1` |
| 13 | LIVE: frames of sideon.mp4 → /api/audit | `video_usable:false` | `EVAL_LIVE=1` |
| 14 | LIVE: demo check-in → /api/explain | non-empty, ≤ 3 sentences, Hinglish, removed exercises only named as skipped | `EVAL_LIVE=1` |

## Riskiest piece

Claude vision returning sensible, timestamped findings from ~8 frames of a phone squat video within ~15 s.

## Likely judge questions

- Why not let the AI decide the plan? → Safety-critical, so a fixed rule decides and is auditable; the AI only observes and explains.
- How accurate is the form check? → It's an observation for the physio, not a diagnosis; next is pose landmarks for knee angle.
- What's mocked? → Seeded patient and history, demo surgeon contact, no auth.
- Who pays? → Hospitals/surgeons as a post-op adherence tool; patients via a low-cost rehab subscription.

## Cut list

Auth, a database, multi-patient support, MediaPipe knee angles (stretch), voice check-in (Sarvam).
