# Production roadmap (analysis, not built)

What the backend needs if ACL Co-pilot goes from a hackathon prototype to real patients in India.
Legal and regulatory points below are flags to check with a lawyer, not settled conclusions.

## Where the prototype stands

Stateless Next.js app on Vercel: seeded patient JSON, no login, no database. Three gaps matter most:
the AI routes (`/api/audit`, `/api/rom`, `/api/explain`, `/api/transcribe`) have no sign-in and no rate
limit; red flags and the deload rule are hard-coded in `lib/rules.ts`; the physio's contact lives only
in the browser.

## 1. What changes when it stops being a demo

- **Real health data about identifiable people.** Squat videos show faces and homes; check-ins describe symptoms.
- **Records over 9–12 months.** The patient's history becomes the product.
- **Several roles.** Patient, physio, surgeon or clinic admin, and support each see different things.
- **Clinical accountability.** A missed red flag is a clinical incident; every plan must be explainable later.

## 2. Backend building blocks

| Block | What it does | Recommended choice | When |
|---|---|---|---|
| Identity | Sign-in, sessions, roles | Managed auth (Supabase Auth or Firebase Auth): Google SSO **plus phone OTP** (many patients live on phone numbers and WhatsApp; Indian SMS needs a DLT-registered sender). Roles: patient, physio, clinic_admin, support | Now |
| Patient record | Source of truth | Managed Postgres in Mumbai. Tables: clinics, users, patients, surgeries, protocols + versions, care_team, consents, sessions, check_ins, form_checks, rom_measurements, plans, plan_decisions, messages, access_log | Now |
| Media | Videos and photos | Private object storage in Mumbai with short-lived signed URLs. Keep the 8 frames by default, not the raw video; delete after about 90 days unless shared with a physio | Now |
| AI pipeline | Form check, knee bend, explanations | A job queue for video; store prompt version, model, inputs and output for every result; evals in CI; a timeout means "try later", never a guess; per-user daily cap. Later: in-browser pose estimation to *measure* angles, with the LLM only for qualitative cues | Queue and logging now; pose in phase 2 |
| Rules engine | Red flags and the plan | Keep it in code, but move thresholds and exercise lists into versioned protocols per surgeon; store the protocol version and reasons with every plan | Versioning now; clinician editor later |
| Notifications | Reminders and alerts | WhatsApp Business API through a provider, push, SMS fallback, scheduled jobs | Phase 1 (red-flag alert to the clinic) |
| Clinician dashboard | The physio's view | Red flags first, then deloads, then missed sessions; access only through a link the patient consented to | Thin version in phase 1 |
| Observability | Logs, tracing, alerts | Error tracking plus logs that carry IDs only, no symptom text; alert if a red-flag notice isn't delivered within 15 minutes | Now |
| Admin and support | Fixes and audits | Internal pages behind SSO; emergency access is logged with a reason | Phase 2 |

### Wearable integration (Google Health)

Today the activity widget on Home is seeded sample data. A real connection needs these steps:

1. A Google Cloud project with the health API enabled.
2. An OAuth consent screen. Stay in testing mode with named test users until Google reviews the restricted health scopes.
3. A web OAuth client with the app's callback URLs.
4. Client id and secret stored as server environment variables, never in the repo.
5. The patient's data must be in Google's cloud. Health Connect data that lives only on the phone needs an Android app.
6. Token storage per user in the database, with revocation.

Uncertain: the older Google Fit web API was being retired. Confirm the current API and endpoints in Google's documentation before building.

## 3. Security and privacy must-haves

- **DPDP Act 2023:** explicit consent per purpose, purpose limitation, rights to access, correct and erase, breach notification, verifiable parental consent for under-18s (teenage athletes are a real ACL group). The rules are being phased in: confirm dates and duties with a lawyer.
- Host in India; encrypt in transit and at rest.
- Per-patient access control in the database, and an append-only log of who viewed what.
- Secrets in a managed store, rotated; sign-in and rate limits on every AI route.
- Keep personal data out of prompts and logs: frames, side and symptoms only, never names or numbers.
- Vendor terms: data-processing agreements with Anthropic and Sarvam; ask about zero retention and where processing happens.
- Sharing with a physio is a revocable consent record, replacing deep links. Account deletion removes media and records.
- **Medical-device question (CDSCO):** software that diagnoses or drives treatment may count as a medical device. "Observations to discuss with your physio" with a clinician in the loop may lower the class, but an automatic deload arguably drives treatment. Unsettled: get regulatory advice early.

## 4. Clinical safety and quality

- Validation study: form check against 2–3 physios, knee-bend estimate against a goniometer, on about 50 or more patients.
- A red-flag escalation target (for example, clinic acknowledgement within 2 hours) with a named human on call.
- Surgeon sign-off on each protocol version.
- Incident reporting: every missed or false flag becomes a test case.
- No model or prompt change ships unless it passes the evals and the red-flag phrase set.

## 5. Roadmap

**Phase 1: private pilot with one clinic (6–8 weeks)**
- Sign-in with Google SSO, phone OTP and roles (configure)
- Postgres in Mumbai with access rules and an access log (build)
- Rate limits and personal-data-free logs on the AI routes (configure)
- Versioned protocol with surgeon sign-off (build)
- Red-flag WhatsApp alert to the clinic, with an on-call rota (buy, configure)
- Consent screens and a DPDP legal review (build, buy)

**Phase 2: paid pilot, several physios (2–3 months)**
- Physio dashboard and care-team invites (build)
- Async video queue and an AI audit store (buy, build)
- Validation study (build)
- Pose-landmark knee angles (build)
- WhatsApp reminder templates (configure)
- Regulatory classification opinion (buy)

**Phase 3: scale**
- Clinician-editable protocol editor (build)
- Clinics as separate tenants, admin tooling (build, buy)
- Self-serve deletion and data export (build)
- ISO 27001 or SOC 2 readiness (buy)
- More Indian languages through Sarvam (configure)

## 6. What not to build yet

- Free-text chat with an AI "physio"
- A custom-trained pose model
- Payments and subscriptions
- Hospital-record (EMR/ABDM) integration, until a clinic asks for it

## 7. Three questions whose answers change the architecture

1. **Who is the buyer, the clinic or the patient?** It decides who owns the data and how onboarding works.
2. **Must the raw video be kept for the physio?** It decides storage cost and how serious a breach would be.
3. **Does the plan stay automatic, or become a physio-approved suggestion?** It decides the regulatory class and the staffing for escalations.
