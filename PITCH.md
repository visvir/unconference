# ACL Co-pilot: cheat sheet

## The 20-second pitch
I tore my ACL 15 months ago. After surgery in India, most patients rehab alone for 9 to 12 months. ACL Co-pilot watches one squat on your phone, spots form problems, and turns a Hinglish check-in into a safe plan for today.

## Three things to make sure they notice
1. The AI watches the squat and points to the exact moment. Tap the chip, the video jumps there.
2. It refuses to guess on a bad video. Wrong angle: it says how to film again.
3. The AI never decides the plan. Fixed, tested rules and red flags do.

## How it works, in five lines
1. The browser takes 8 frames. Claude Opus 5.5 returns typed scores, 0 to 3, with a timestamp.
2. A red-flag check in plain code runs first, before any AI.
3. A fixed rule decides deload: load went up yesterday, and swelling is more or a score is 2 or higher.
4. Claude Sonnet 5.5 writes a 2-sentence note in the patient's language.
5. Voice: Sarvam speech-to-text, Roman script, so the red-flag check still works.

## New since the first build
- Voice check-in: speak in Hinglish, Sarvam turns it into text to review.
- 10-minute plan: a fixed rule for a short session.
- This week: sessions done and missed, on Home.
- My recovery: rehab phases, past sessions, and sharing an update with the physio.
- Knee bend from a photo: Claude estimates flexion from one side-on photo.

## What's mocked
- Patient, history and today's plan are seeded. No login, no database.
- Samples: two stock clips and my own squat. Their Claude responses are saved from real calls.
- Surgeon and physio names are placeholders.
- With ?demo=1, saved responses are replayed. Anything typed or uploaded goes to Claude live.

## Hard questions and honest answers
**How accurate is it from 8 frames?** Not validated yet. It is an observation to discuss with a physio, not a diagnosis.

**Why not let the AI decide the plan?** It is safety-critical. A fixed rule can be tested and audited. The AI only observes and explains.

**Isn't the demo cached?** Yes, ?demo=1 replays real saved Claude responses so there is no wait. Without it, the same link calls Claude live, about 10 seconds.

**How do you know 2/3 is right?** It isn't clinically validated. We checked it against a control: the same settings score a clean squat 0/0/0, and at a lower effort setting the model under-read this clip as 1/3, so we raised it.

**Red flags are just keywords?** Yes. It is keyword matching in English and Hinglish, and it errs on the side of caution. It even triggers on "no calf pain". Not clinically validated.

**What about privacy?** Only 8 small frames leave the phone, sent to the Anthropic API. The app stores nothing.

**Who pays?** A hypothesis, not tested. Surgeons and hospitals as a post-op follow-up tool, or a low-cost patient subscription.

**What's next?** Pose landmarks for real knee angles, a physio in the loop, a weekly brief to the physio, and more exercises.

**Does the app send email or WhatsApp itself?** No. It opens the patient's own mail app or WhatsApp with the message ready. The physio's contact stays on the device.

**How accurate is knee bend from a photo?** It is an estimate from one photo, about ±10°, and not validated. Pose landmarks are the next step.

## If something breaks on stage
- Form check fails: tap Clean squat, or use the live link without ?demo=1.
- Plan note is slow: the fallback sentence appears, and the plan never depends on the model.
- Link or Wi-Fi dies: play the backup screen recording.
