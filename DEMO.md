# Demo

**Result:** first prize at the Speedrun: Buildathon powered by Anthropic, Builders’ Day, Product (Un)Conference ’26, 22 November 2026.

> This is the record of the stage demo. The founder's own "Knee caves in" clip was shown on stage and removed afterwards for privacy, so the public repo bundles two samples: "Wrong angle" and "Clean squat". Live uploads need the owner passcode (enter it at `/unlock`). To run the knee-caving step as written, unlock and upload your own clip.

## Problem statement

After ACL reconstruction, patients in India are mostly unsupervised for 9–12 months of rehab. They
progress load on their own, miss form compensations (knee caving in, leaning away from the leg) and
don't know when a swollen knee means "back off" versus "call the surgeon". ACL Co-pilot turns the phone
camera into a physio watching your form, and turns a daily Hinglish check-in into a safe plan for today.

## One line

For a patient months into unsupervised ACL rehab: film one squat and say how the knee feels, and get a
form check and a safe plan for today, explained in their own language.

## The one flow: happy path (3 min + ~1 min Q&A)

Opened **https://unconference-ruby.vercel.app/?demo=1** on the stage laptop (saved model responses: no model-latency risk; the site itself still needs network).
Backup: the same link without `?demo=1` (live Claude, owner passcode needed today), then the screen recording.

| Time | Screen / action | Say | If it breaks |
|---|---|---|---|
| 0:00 | (link open on Home) | "15 months ago I tore my ACL. After surgery you see a physio maybe once a week; the other 6 days you're alone, guessing. In India that's most patients, for 9–12 months." | — |
| 0:25 | **Home**: Arjun, week 10, hamstring graft, flexion 104°→123°, "Yesterday: progressed to bodyweight squats" | "Meet Arjun. His knee is improving, and yesterday he progressed to bodyweight squats, which is exactly when people overdo it." | Refresh; Home is static, it can't fail. |
| 0:45 | Tap **Check my progress** → **Squat form** → **Wrong angle** | "Before training he films one squat. The browser pulls 8 frames and Claude looks at them like a physio would. First, a badly filmed one." → "It refuses to guess and says exactly how to film it again. In rehab a confident wrong answer is worse than none." | Skip to the next sample. |
| 1:05 | Tap **Knee caves in** (shown on stage with the founder's own clip; not bundled in the public repo; my own squat, filmed that day) → cards: knee caving in Moderate 2/3 at 2.3 s, weight shift Mild 1/3 → tap **▶ See it at 2.3s** → the video jumps there; two cues | "This is my own knee, 15 months after surgery. It sees the right knee caving in, shows me the exact moment, and gives two cues for the next rep. It also noticed I shift weight off the operated leg." | Tap **Clean squat** (0/3, "it doesn't invent problems") or use the live link (about 10 s, with the owner passcode). |
| 1:30 | **Next** → check-in → **Use example** (Hinglish) → swelling **More** → **Get today's plan** | "Then he tells it how the knee feels, the way he'd text his physio, in Hinglish." | Type the text by hand. |
| 1:50 | **Lighter day today**: Hinglish note, "Why (fixed safety rule)", squats + bike crossed out | "This is the key design choice. **The AI doesn't decide the plan.** A fixed, tested rule does: load went up yesterday plus more swelling means deload. Claude only explains it, in his language, and notice the form check feeds the rule: a 2 out of 3 is one of the listed reasons." | If the note is slow, the fallback sentence appears; the plan itself never depends on the model. |
| 2:20 | edit the text box: clear it and type **"calf mein dard aur sujan hai"** → **Get today's plan** | "And safety always comes first. Calf pain and swelling after knee surgery can mean a clot…" | — |
| 2:30 | **Safety stop** (calm, in the app's style): "Let's check with your physio or surgeon first", exercises paused, 108 for chest pain or breathing trouble | "…so it stops everything and tells him to call his surgeon today. That check runs before any AI." | — |
| 2:40 | — | "Mocked: the patient and history are seeded and there's no login; demo mode replays saved real Claude responses. Next: knee angles from pose landmarks, and a weekly brief to the physio." | — |

## Optional extras (shown if asked)

| Extra | Tap path | Say |
|---|---|---|
| Live squat coach | Home → **Check my progress** → **Live squat coach** → **Start camera**. Allow the camera on the stage laptop beforehand. Fallback: the recorded check. Confirmed on a real laptop camera; thresholds are untuned. | "And this is the same idea, live: it tells me to step back, counts my reps and cues my knee as I move. It runs in the browser; nothing is uploaded." |
| Physio's advice | Home → **Add my physio's advice** → **Sample physio note (PDF)** → **Apply to today's plan** → check-in. | "His physio's notes come in as a PDF or a pasted WhatsApp message. Claude reads them, shows the physio's own words, and code applies them to the plan. The safety rule still wins." |
| Activity | Scroll down Home. | "General activity comes from the wearable. Today that is sample data; the app's job is the knee." |
| Voice check-in | Check-in page, tap **🎙 Speak instead**, speak, review the text, submit. Allow the microphone on the stage laptop beforehand. Fallback: type. | "He can just say it, in Hinglish." |
| 10-minute plan | On the plan card, tap **⏱ Only 10 minutes today?** | "The real reason rehab fails is skipped sessions. I skipped mine when work got busy. A short session beats a skipped one." |
| My recovery + share | Home, then **My recovery**; scroll to **Share with my physio**; tap **WhatsApp** or **Email my physio**. | "His whole journey, and one tap to send the physio an update from his own WhatsApp or email." |
| Knee bend from a photo | Home → **Check my progress** → **Knee bend**, use the sample photo, read "About N°, estimate ±10°". Do not tap "Add to my chart" with the sample photo: it reads 90° because it is a squat frame. | "The same camera can estimate knee bend, so the chart stops being self-reported. It's an estimate, labelled as one." |

## What the mentors asked for and what was built

- Bring in the physio's advice, not just the app's rules → **Physio's advice**: a PDF or pasted message becomes plan changes, in the physio's own words.
- Make the form check feel live → **Live squat coach**: in-browser pose tracking with framing cues, form cues and rep counts (beta).
- Show the wearable's general activity → **Activity widget** on Home (sample data, labelled).

## Judging checklist

| Criterion | How this build earns it |
|---|---|
| It works | Full loop on the public link, no login; `?demo=1` has no model latency (saved model responses; the site still needs a network) |
| Problem and user | The founder is 15 months post-ACL; unsupervised rehab is the norm in India |
| Product sense and feasibility | AI observes and explains; deterministic rules decide; red flags always escalate; the physio is in the loop |
| Use of AI | Vision form audit over frames, explanation in the patient's own language (Hinglish or English), voice transcription (Sarvam), knee-bend estimate from one photo, reading a physio's PDF or pasted note, live pose tracking in the browser |
| Demo | Script above, saved-response demo mode, backup recording |

## Eval cases

`evals/run.sh` (run by `scripts/verify.sh`; `BASE=` to target localhost; ~6 s, 60 end-to-end checks; 223 unit checks run separately with `npm test`). `EVAL_LIVE=1` adds real model calls (~15 s).

| # | Input | Expected | Check |
|---|---|---|---|
| 1 | GET /, /audit, /checkin | 200; "Knee bend" + "Arjun", "Squat form check", "How's the knee today" + "Hinglish" | contains |
| 2 | each sample in `lib/flow.ts` | `/samples/<id>.mp4` served, `data/cache/audit-<id>.json` exists | status / file |
| 3 | POST /api/audit `{"sample":"reference"}` | contract (usable bool, findings type/severity 0–3/timestamp/exactly 2 cues), 3 findings all ≤ 1, cached | node JSON |
| 4 | POST /api/audit `{"sample":"sideon"}` | `video_usable:false`, re-record reason, no findings | node JSON |
| 5 | POST /api/audit {"sample":"valgus"} (the removed "Knee caves in" clip; shown on stage with the founder's own clip; not bundled in the public repo) | usable, knee_valgus ≥ 2 with timestamp and 2 cues | node JSON (skipped without the clip) |
| 6 | /api/audit unknown sample / 0 frames / 13 frames | 404 / 400 / 400 with `error` | status |
| 7 | POST /api/explain `demo:true, decision:"deload"` | non-empty cached explanation, no markdown | node JSON |
| 8 | rules: 14 scenarios in `data/test-cases.json` | proceed / deload / red flag as labelled (incl. unusable video ignored, no-load-up → proceed) | `npm test` |
| 9 | rules: exact demo check-in, seeded patient | no red flag; deload with or without audit; keeps only heel slides, quad sets, SLR, ice; bodyweight squats removed | `npm test` |
| 10 | rules: red flags, every category, English + Hinglish (29 phrases) | hit with the right label; every category in `lib/rules.ts` has a test; negation still escalates | `npm test` |
| 11 | rules: 14 normal rehab phrases (calf raises, khichav, block/clock…) | no false alarm; known false alarms/misses print ⚠ | `npm test` |
| 12 | LIVE: frames of reference.mp4 → /api/audit | usable, one finding per type, all ≤ 1 | `EVAL_LIVE=1` |
| 13 | LIVE: frames of sideon.mp4 → /api/audit | `video_usable:false` | `EVAL_LIVE=1` |
| 14 | LIVE: demo check-in → /api/explain | non-empty, ≤ 3 sentences, Hinglish, removed exercises only named as skipped | `EVAL_LIVE=1` |
| 15 | POST /api/notes `{"sample":"sample"}`; `{"text":"hi"}` | cached, usable, instructions with quotes; too-short text gives 400 | node JSON / status |
| 16 | GET /live | 200; "Live squat coach"; `/check` links to `/live` | contains |
| 17 | GET / | shows the activity widget labelled "Sample data" | contains |
| 18 | unit tests: `lib/pose.ts` (30), `applyNotes` incl. deload wins | pass | `scripts/run-tests.sh` |
| 19 | owner lock: public POST to paid routes (audit with frames, rom, notes, transcribe); response headers | 403 `locked`; saved samples still work; nosniff, frame deny, referrer and permissions policies present. 11 unit tests cover `lib/guard.ts` | status / headers / `scripts/run-tests.sh` |

## Riskiest piece

Claude vision returning sensible, honest findings from ~8 frames of a phone squat video within ~15 s: refusing a wrong-angle clip, finding nothing on a clean one, and rating a real inward knee cave without exaggerating.

## Likely judge questions

- Why not let the AI decide the plan? → Safety-critical, so a fixed rule decides and is auditable; the AI only observes and explains.
- How accurate is the form check? → It's an observation for the physio, not a diagnosis; next is pose landmarks for knee angle.
- What's mocked? → Seeded patient and history, placeholder surgeon and physio names, sample Activity data, no auth. Demo mode replays saved responses.
- Who pays? → Hospitals/surgeons as a post-op adherence tool; patients via a low-cost rehab subscription.
- How do you know 2/3 is right? → It isn't clinically validated. We checked it against a control: the same settings score a clean squat 0/0/0, and at a lower effort setting the model under-read this clip as 1/3, so we raised it.

## Cut list

Auth, a database, multi-patient support, real Google Health sign-in (built on the `google-health` branch; the test account had no cloud data, so it is not live).
