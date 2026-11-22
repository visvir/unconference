# ACL Co-pilot

**An AI rehab co-pilot for people recovering from ACL knee surgery.** Your phone camera checks your squat the
way a physio would, a daily check-in in English or Hinglish becomes a safe plan for today, and fixed safety
rules, not the AI, make every decision that matters.

> 🏆 **First prize, [Speedrun: Buildathon powered by Anthropic](https://unconference.theproductfolks.com/speedrun)**
> at Builders’ Day, [Product (Un)Conference ’26](https://unconference.theproductfolks.com/) by
> [The Product Folks](https://www.theproductfolks.com/), Bengaluru, 22 November 2026.
> Built solo in four hours, in a field of 100+ builders.

**Live demo:** https://unconference-ruby.vercel.app/?demo=1 (no login; the demo replays saved AI responses, so it
costs nothing to try)

## Why I built it

I tore my ACL and had it reconstructed. After surgery you see a physiotherapist perhaps once a week. For the
other six days, for nine to twelve months, you are on your own: guessing whether your form is right, whether
today's swelling means "back off" or "call the surgeon", and skipping sessions when work gets busy. In India
that is the normal experience of ACL rehab. ACL Co-pilot is the tool I wanted during those months.

## What it does

The core flow takes about a minute:

1. **Home** shows where the patient is: week 10 after surgery, knee bend improving, and yesterday's step up in
   exercise load.
2. **Check my progress → Squat form.** The patient films one squat. The browser picks 8 frames and Claude
   rates three things a physio looks for (knee caving in, weight shifting off the operated leg, hip tilt) from
   0 to 3, points to the exact moment in the video, and gives two cues for the next rep. If the video is
   filmed from the wrong angle, it says so and explains how to film it again. It does not guess.
3. **Daily check-in.** The patient types or says how the knee feels, the way they would text their physio,
   and picks whether swelling is less, the same or more than yesterday.
4. **Safety first.** Before any AI runs, plain code looks for warning signs (calf pain, fever, wound
   problems, the knee locking or giving way, chest pain or breathlessness) in English and Hinglish. If it
   finds one, the day's exercises are paused and the patient is asked to call their physio or surgeon.
5. **Today's plan.** A fixed rule decides: if load went up yesterday and either swelling is up or the form
   check scored 2 or more, today is a lighter day. Claude only writes a two-sentence explanation in the
   patient's own language.

### The design choice that matters

**The AI observes and explains. Tested code decides.** In post-surgery rehab a confident wrong answer can mean
a re-injury, so nothing safety-critical depends on a model's judgement. The warning-sign check and the plan
rule are ordinary TypeScript with unit tests, and every plan shows the reasons behind it.

## Everything in the app

| Feature | What it does | AI or rule |
|---|---|---|
| **Squat form check** | 8 frames from a short video; three scores with a timestamp and coaching cues; refuses bad angles | Claude Opus 5.5 (vision, structured output) |
| **Live squat coach** (beta) | Camera on, pose tracking in the browser: "step back", "push your right knee out", rep and clean-rep counts. Nothing is recorded or uploaded | MediaPipe pose landmarks + tested rules |
| **Knee bend from a photo** | One side-on photo gives an estimate of knee flexion to the nearest 5°, labelled as an estimate | Claude Opus 5.5 (vision) |
| **Daily check-in** | Typed or spoken, English or Hinglish | Sarvam speech-to-text for voice |
| **Warning-sign check** | Pauses the day and tells the patient who to call | Rule (no AI) |
| **Today's plan** | Normal day or lighter day, with the reasons listed | Rule; Claude Sonnet 5.5 writes the explanation |
| **Physio's advice** | Paste the physio's message or upload their PDF; each instruction is shown in the physio's own words and applied to the plan. The safety rule still wins | Claude Sonnet 5.5 extracts; code applies |
| **Only 10 minutes today?** | A short version of the plan, most protective exercises first | Rule |
| **My recovery** | The five phases of ACL rehab with "you are here", plus past sessions | Seeded data |
| **Share with my physio** | A progress summary, ready to send from the patient's own WhatsApp or Gmail | Built by code; the app sends nothing itself |
| **Activity** | Steps, active minutes, sleep and a note when a big day adds load to the knee | Sample data (see below) |

## How it works

```
Browser                               Server (Next.js on Vercel)                 Model
───────                               ──────────────────────────                 ─────
video → 8 timestamped frames   ──▶    /api/audit   validate → lock → parse  ──▶  Claude Opus 5.5
photo → resized JPEG           ──▶    /api/rom     validate → lock → clamp  ──▶  Claude Opus 5.5
physio text or PDF             ──▶    /api/notes   validate → lock → clean  ──▶  Claude Sonnet 5.5
check-in text                  ──▶    lib/rules.ts (warning signs, plan)         none: plain code
plan + reasons                 ──▶    /api/explain                           ──▶  Claude Sonnet 5.5
voice recording                ──▶    /api/transcribe                        ──▶  Sarvam saaras:v4
camera (live coach)                   never leaves the browser                   MediaPipe, on device
```

- **Video never leaves the phone.** Only eight small frames (about 300 KB in total) are sent, whatever the
  size of the original clip.
- **Typed, checked outputs.** Each model call returns structured data against a Zod schema, and code then
  clamps and cleans it before anything is shown.
- **Rules in one place.** `lib/rules.ts` holds the warning-sign check, the plan rule and the 10-minute plan.
  `lib/pose.ts` holds the live-coach logic. Both are pure functions with tests.
- **Hinglish stays checkable.** Voice is transcribed into Roman script, so a spoken "pindli mein dard hai"
  still triggers the calf-pain warning.

## Quality and safety

- **223 unit checks** across six test files (`npm test`): plan decisions, warning-sign phrases in English and
  Hinglish with false-alarm controls, pose logic, share links, the access lock.
- **60 end-to-end checks** against the deployed site (`evals/run.sh`): pages, response contracts, bad input,
  locked routes and security headers.
- **Test first for every bug.** Each fix started as a failing test.
- **Access and cost protection.** Anything that spends money needs an owner passcode in production
  (`DEMO_ACCESS_CODE`, entered once at `/unlock`). Visitors use the bundled samples, which replay saved
  responses. With no passcode set, the site refuses all paid calls.
- **Baseline security headers** on every page, with camera and microphone allowed for this site only.

## What is real and what is mocked

This is a hackathon prototype, not a medical product.

- **Seeded:** the patient ("Arjun"), his history, the weekly sessions strip, the rehab phases, and the names
  of the surgeon and physio. There is no login and no database.
- **Sample data:** the Activity card. A real Google Health sign-in was built on the `google-health` branch and
  tried once; it connected, but the test account had no activity stored in Google's cloud, so it is not live.
- **Samples:** two stock squat clips from Pexels and a fictional physio note
  (see [`public/samples/CREDITS.md`](public/samples/CREDITS.md)). Their AI responses were recorded from real
  calls and are replayed in demo mode.
- **Not validated:** the squat scores, the knee-bend estimate and the live-coach thresholds have not been
  checked against physiotherapists or a goniometer. Everything is framed as an observation to discuss with a
  physio or surgeon, never a diagnosis.

## How it was built

Four hours, one person, on 22 November 2026.

- **Pair-built with [Claude Code](https://claude.com/claude-code).** One session planned, reviewed and
  verified the work, and delegated the writing of code to parallel agents: a code reviewer before each
  commit, an evals owner, a QA tester, a demo critic scoring against the judging criteria, and an agent
  briefed as an ACL physiotherapist whose critique came to me to decide on, not straight into the code.
- **A definition of done that ran after every change:** lint, type check, unit tests, a build, end-to-end
  checks against the live link and a secret scan (`scripts/verify.sh`).
- **Deployed in the first half hour, then redeployed after every change,** so the demo link was never more
  than a few minutes behind the code.
- **Three features were added in the last hour from mentor feedback:** the physio's advice, the live squat
  coach and the activity card.

The build harness is in the repo: [`CLAUDE.md`](CLAUDE.md), [`.claude/`](.claude) and [`scripts/`](scripts).

## Run it locally

```bash
npm install
# create .env with your own keys (never commit it):
#   ANTHROPIC_API_KEY=...
#   SARVAM_API_KEY=...        (only needed for voice check-in)
npx next dev -p 3005          # open http://localhost:3005
npm test                      # unit checks
BASE=http://localhost:3005 evals/run.sh   # end-to-end checks
```

Add `?demo=1` to any page to replay the saved responses without calling a model.

## Repository guide

| File | What it is |
|---|---|
| [`DEMO.md`](DEMO.md) | The three-minute stage script, the judging checklist and the eval list |
| [`PITCH.md`](PITCH.md) | The 20-second pitch and honest answers to hard questions |
| [`ROADMAP.md`](ROADMAP.md) | What a production backend needs: sign-in, records, privacy law, clinical validation, phases |
| [`DESIGN.md`](DESIGN.md) | The visual design brief ("ink + volt on paper") |
| [`HANDOVER.md`](HANDOVER.md) | Current status and maintenance notes |
| `app/`, `components/`, `lib/` | The application: pages, UI and the pure logic |
| `evals/`, `scripts/` | End-to-end checks, unit tests and build scripts |

## Built with

Next.js 16 · TypeScript · Tailwind CSS 4 · Recharts · Zod · Anthropic SDK (Claude Opus 5.5 and Sonnet 5.5) ·
Sarvam speech-to-text · MediaPipe Tasks Vision · Vercel · ffmpeg · Claude Code

## Licence and disclaimer

MIT licensed (see [`LICENSE`](LICENSE)). ACL Co-pilot is a prototype for demonstration. It is not a medical
device and does not give medical advice. If you are recovering from surgery, follow your surgeon's and
physiotherapist's instructions.
