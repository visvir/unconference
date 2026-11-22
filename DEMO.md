# Demo

## Problem statement

After ACL reconstruction, patients in India are mostly unsupervised for 9–12 months of rehab. They
progress load on their own, miss form compensations (knee caving in, leaning away from the leg) and
don't know when a swollen knee means "back off" versus "call the surgeon". ACL Co-pilot turns the phone
camera into a physio watching your form, and turns a daily Hinglish check-in into a safe plan for today.

## One line

For a patient months into unsupervised ACL rehab: film one squat and say how the knee feels, and get a
form check and a safe plan for today, explained in their own language.

## The one flow: happy path (3 min + ~1 min Q&A)

Open **https://unconference-ruby.vercel.app/?demo=1** on the stage laptop (cached model responses: no model-latency risk; the site itself still needs network).
Backup: the same link without `?demo=1` (live Claude), then the screen recording.

| Time | Screen / action | Say | If it breaks |
|---|---|---|---|
| 0:00 | (link open on Home) | "15 months ago I tore my ACL. After surgery you see a physio maybe once a week; the other 6 days you're alone, guessing. In India that's most patients, for 9–12 months." | — |
| 0:25 | **Home**: Arjun, week 10, hamstring graft, flexion 104°→123°, "Yesterday: added single-leg squats" | "Meet Arjun. His knee is improving, and yesterday he progressed to single-leg squats, which is exactly when people overdo it." | Refresh; Home is static, it can't fail. |
| 0:45 | Tap **Check my squat form** → **Sample: wrong angle** → result "Let's re-record" | "Before training he films one squat. The browser pulls 8 frames and Claude looks at them like a physio would. First, a bad video: filmed from the side. It refuses to guess. It tells him exactly how to film it again. In rehab a confident wrong answer is worse than no answer." | Skip to the clean sample. |
| 1:10 | Tap **Sample: clean two-leg squat** → three 0/3 cards, each with Claude's observation | "Now a clean one. Knee tracking, trunk, pelvis: all fine, and it says why. It doesn't invent problems, and it even notices this is a two-leg squat, not the single-leg one he was asked for." | The live (non-demo) link, ~8 s. |
| 1:35 | **Next** → check-in → **Use example** (Hinglish) → swelling **More** → **Get today's plan** | "Then he tells it how the knee feels, the way he'd text his physio, in Hinglish." | Type the text by hand. |
| 1:55 | **Lighter day today**: Hinglish note, "Why (fixed safety rule)", squats + bike crossed out | "This is the key design choice. **The AI doesn't decide the plan.** A fixed, tested rule does: load went up yesterday plus more swelling means deload. Claude only explains it, in his language." | If the note is slow, the fallback sentence appears; the plan itself never depends on the model. |
| 2:25 | edit the text box: clear it and type **"calf mein dard aur sujan hai"** → **Get today's plan** | "And safety always comes first. Calf pain and swelling after knee surgery can mean a clot…" | — |
| 2:35 | **Red screen**: Contact your surgeon today, 108 | "…so it stops everything and tells him to call his surgeon today. That check runs before any AI." | — |
| 2:45 | — | "Mocked: the patient and history are seeded and there's no login; demo mode uses saved responses from real Claude calls. When the knee does cave in, the same check rates it 0 to 3 and jumps the video to the exact moment (capability, not shown: no sample clip). Next: knee angles from pose landmarks, and a weekly brief to the physio." | — |

## Judging checklist

| Criterion | How this build earns it |
|---|---|
| It works | Full loop on the public link, no login; `?demo=1` has no model latency (cached model responses; the site still needs a network) |
| Problem and user | Founder is 15 months post-ACL; unsupervised rehab is the norm in India |
| Product sense and feasibility | AI observes and explains; deterministic rules decide; red flags always escalate |
| Use of AI | Vision form audit over frames, explanation in the patient's own language (Hinglish or English) |
| Demo | Script above, cached demo mode, backup recording |

## Eval cases

`evals/run.sh` (run by `scripts/verify.sh`; `BASE=` to target localhost; ~6 s). `EVAL_LIVE=1` adds real model calls (~15 s).

| # | Input | Expected | Check |
|---|---|---|---|
| 1 | GET /, /audit, /checkin | 200; "Knee bend" + "Arjun", "Squat form check", "How's the knee today" + "Hinglish" | contains |
| 2 | each sample in `lib/flow.ts` | `/samples/<id>.mp4` served, `data/cache/audit-<id>.json` exists | status / file |
| 3 | POST /api/audit `{"sample":"reference"}` | contract (usable bool, findings type/severity 0–3/timestamp/exactly 2 cues), 3 findings all ≤ 1, cached | node JSON |
| 4 | POST /api/audit `{"sample":"sideon"}` | `video_usable:false`, re-record reason, no findings | node JSON |
| 5 | POST /api/audit `{"sample":"valgus"}` (only if cached) | not in the demo (no clip); code path covered by rule tests. Silent if the cache is absent | node JSON |
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

Claude vision returning sensible, honest findings from ~8 frames of a phone squat video within ~15 s: refusing a wrong-angle clip and finding nothing on a clean one (no knee-valgus clip in the demo).

## Likely judge questions

- Why not let the AI decide the plan? → Safety-critical, so a fixed rule decides and is auditable; the AI only observes and explains.
- How accurate is the form check? → It's an observation for the physio, not a diagnosis; next is pose landmarks for knee angle.
- What's mocked? → Seeded patient and history, demo surgeon contact, no auth.
- Who pays? → Hospitals/surgeons as a post-op adherence tool; patients via a low-cost rehab subscription.

## Cut list

Auth, a database, multi-patient support, Surgeon Brief PNG/WhatsApp share (cut for scope), MediaPipe knee angles (stretch), voice check-in (Sarvam), knee-valgus sample clip (no license-clean footage found; founder couldn't film on the day).
