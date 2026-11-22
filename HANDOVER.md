# Project status and maintenance

## Status

- **Live:** https://unconference-ruby.vercel.app (demo mode: `?demo=1`). The repository is public.
- **Result:** first prize at the Speedrun: Buildathon powered by Anthropic, Builders’ Day, Product
  (Un)Conference ’26, Bengaluru, 22 November 2026, among 100+ builders.
- **Checks:** 223 unit checks across six test files and 60 end-to-end checks against production.
- **Built and working:** squat form check, live squat coach (beta), knee bend from a photo, daily check-in
  (typed or voice), warning-sign check, today's plan, physio's advice, 10-minute plan, My recovery, sharing
  with the physio, Activity card (sample data).
- **Samples:** two stock squat clips ("Wrong angle", "Clean squat"), one knee-bend photo and one fictional
  physio note. See [`public/samples/CREDITS.md`](public/samples/CREDITS.md).

See [`README.md`](README.md) for what the app does and what is real or mocked.

## How to run, test and deploy

```bash
npm install
# create .env with your own keys (never commit it):
#   ANTHROPIC_API_KEY=...
#   SARVAM_API_KEY=...        (only needed for voice check-in)
npx next dev -p 3005          # open http://localhost:3005
npm test                      # unit checks
BASE=http://localhost:3005 evals/run.sh   # end-to-end checks
scripts/verify.sh             # lint, type check, unit tests, build, evals, secret scan
vercel deploy --prod --yes    # deploy to production
```

Add `?demo=1` to any page to replay saved responses without calling a model. Environment variables reach only
deployments made after they are added, so redeploy after changing one.

## Access

Every route that spends money (form check, knee bend, physio's advice, voice transcription) needs an owner
passcode in production. It is the environment variable `DEMO_ACCESS_CODE`. The owner enters it once at
`/unlock`, which sets a 12-hour httpOnly cookie. Visitors use the samples, which replay saved responses.
With no passcode set, the site refuses all paid calls.

```bash
# set (the value is read from stdin, so it is not left in shell history)
printf '%s' 'NEW-PASSCODE' | vercel env add DEMO_ACCESS_CODE production
# rotate: remove, then add again
vercel env rm DEMO_ACCESS_CODE production --confirm-name DEMO_ACCESS_CODE
printf '%s' 'NEW-PASSCODE' | vercel env add DEMO_ACCESS_CODE production
# remove (the site then refuses every paid call)
vercel env rm DEMO_ACCESS_CODE production --confirm-name DEMO_ACCESS_CODE
vercel deploy --prod --yes    # needed after any change
```

Removal needs `--confirm-name`. A redeploy is needed after every change.

## Branches and tags

| Name | What it is |
|---|---|
| `main` | The live site |
| `google-health` | Optional real Google Health sign-in, off by default. Not merged (see Known limits) |
| `design-refresh` | The "ink + volt" redesign and the mentor-feedback features. Merged into `main` |
| tag `submission` | The version submitted to the event |
| tag `final-before-lock` | The last version before submissions locked |

## Known limits

- **Seeded:** the patient, his history, the weekly sessions strip, the rehab phases and the names of the
  surgeon and physio. No login and no database.
- **Sample data:** the Activity card. The Google Health sign-in on `google-health` connected, but the test
  account had no activity in Google's cloud, so it is not live.
- **Not validated:** the squat scores, the knee-bend estimate and the live-coach thresholds have not been
  checked against physiotherapists or a goniometer.
- **Confirmed by hand:** voice check-in with the founder's real voice; the live squat coach on a real laptop
  camera.
- **No WhatsApp number is built in.** Sharing opens the patient's own WhatsApp or mail app.
- **Not a medical product.** Everything is an observation to discuss with a physio or surgeon.

## Open housekeeping

- Purge old git history of the removed media and names. This rewrites history and needs a force-push.
- Delete old Vercel deployments. They are private behind a Vercel login.
- Set a spend limit in the Anthropic Console.
- A local `next build` inside a OneDrive folder can fail with `ENOTEMPTY` or `ETIMEDOUT` on a conflict
  folder. This is a sync problem, not a code error. Build outside OneDrive, or pause sync.
