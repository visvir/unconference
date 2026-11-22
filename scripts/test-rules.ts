// Runs the deterministic rules engine against data/test-cases.json plus targeted checks. `npm test`.
// Prints ✔/✘ per case; ⚠ only for missing demo assets. Bugs are hard assertions (red/green TDD).
import { existsSync, readFileSync } from "node:fs";
import cases from "../data/test-cases.json" with { type: "json" };
import patient from "../data/patient.json" with { type: "json" };
import { checkRedFlags, decidePlan } from "../lib/rules.ts";
import type { CheckIn, Exercise, Session, Swelling, SquatAudit } from "../lib/types.ts";

let failed = 0;
const warned = 0;
const ok = (cond: boolean, name: string, detail = "") => {
  console.log(`${cond ? "✔" : "✘"} ${name}${!cond && detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
};
const section = (s: string) => console.log(`\n# ${s}`);

const planned = patient.todayPlan as Exercise[];
const lastSession = patient.sessions.at(-1) as Session;
const KEEP = ["heel_slides", "quad_sets", "slr", "ice"];
const audit = (sev: number, usable = true): SquatAudit => ({
  video_usable: usable,
  summary: "",
  findings: [{ type: "knee_valgus", severity: sev as 0 | 1 | 2 | 3, timestampSec: 1, observation: "", cues: ["", ""] }],
});
const ids = (xs: Exercise[]) => xs.map((e) => e.id).sort().join(",");

// Invariants every deload plan must satisfy (the safety contract of the demo).
function deloadInvariants(name: string, plan: ReturnType<typeof decidePlan>) {
  const loading = plan.exercises.filter((e) => e.kind === "loading").map((e) => e.id);
  ok(loading.length === 0, `${name}: no loading exercise kept`, `kept ${loading.join(",")}`);
  ok(ids(plan.exercises) === [...KEEP].sort().join(","), `${name}: keeps exactly heel slides, quad sets, SLR, ice`, `kept ${ids(plan.exercises)}`);
  ok(ids([...plan.exercises, ...plan.removed]) === ids(planned), `${name}: kept + removed = planned`);
  ok(plan.reasons.length > 0, `${name}: has deterministic reasons`);
}

// ── 1. Scenario cases (data/test-cases.json) ─────────────────────────────
section("scenarios (data/test-cases.json)");
for (const c of cases as Array<(typeof cases)[number] & { videoUsable?: boolean }>) {
  const red = checkRedFlags(c.checkIn.text);
  let pass = red.hit === c.expect.redFlag;
  let got = `redFlag=${red.hit}${red.hit ? ` (${red.matched.join(", ")})` : ""}`;
  if (!red.hit) {
    const yesterday = { ...lastSession, loadIncreased: c.yesterdayLoadIncreased };
    const plan = decidePlan(yesterday, { text: c.checkIn.text, swelling: c.checkIn.swelling as Swelling }, audit(c.maxSeverity, c.videoUsable ?? true), planned);
    got += ` decision=${plan.decision}`;
    if ("decision" in c.expect) pass = pass && plan.decision === c.expect.decision;
    if (plan.decision === "deload") pass = pass && !plan.exercises.some((e) => e.kind === "loading");
  }
  ok(pass, c.name, got);
}

// ── 2. The exact DEMO.md flow, with the real seeded patient (no overrides) ──
section("demo flow (DEMO.md step 3–4, seeded patient)");
const DEMO_TEXT = "Kal squats badhaye the, aaj knee thoda swollen aur stairs pe khichav";
const demoCheckIn: CheckIn = { text: DEMO_TEXT, swelling: "more" };
ok(lastSession.loadIncreased === true, "seed: yesterday's session has loadIncreased=true");
ok(planned.some((e) => e.kind === "loading"), "seed: today's plan has a loading exercise to drop");
ok(!checkRedFlags(DEMO_TEXT).hit, "demo check-in passes the red-flag check", checkRedFlags(DEMO_TEXT).matched.join(","));
for (const [label, a] of [["no form check", null], ["clean audit", audit(0)], ["unusable audit", audit(3, false)]] as const) {
  const plan = decidePlan(lastSession, demoCheckIn, a, planned);
  ok(plan.decision === "deload", `demo check-in + ${label} → deload`, plan.decision);
  if (plan.decision === "deload") deloadInvariants(`demo + ${label}`, plan);
  ok(plan.reasons.some((r) => /swelling/i.test(r)), `demo + ${label}: reason mentions swelling`);
  ok(plan.removed.some((e) => e.id === "squats"), `demo + ${label}: squats removed`);
}
// Deload invariants on the severity path too.
const sevPlan = decidePlan(lastSession, { text: "ok", swelling: "same" }, audit(2), planned);
ok(sevPlan.decision === "deload", "load up + severity 2 → deload");
deloadInvariants("severity-2 deload", sevPlan);
ok(sevPlan.reasons.some((r) => /severity 2\/3/.test(r)), "severity-2 deload: reason names the finding");

// Proceed keeps the full plan untouched.
const proceed = decidePlan({ ...lastSession, loadIncreased: false }, { text: "fine", swelling: "same" }, null, planned);
ok(proceed.decision === "proceed" && ids(proceed.exercises) === ids(planned) && proceed.removed.length === 0, "proceed keeps the full plan, removes nothing");

// ── 3. Unusable video must never count toward severity ───────────────────
section("unusable video ignored");
for (const sev of [2, 3]) {
  const p = decidePlan(lastSession, { text: "ok", swelling: "same" }, audit(sev, false), planned);
  ok(p.decision === "proceed", `unusable audit with severity ${sev} → proceed`, p.decision);
  ok(!p.reasons.some((r) => /form check/i.test(r)), `unusable audit severity ${sev}: no form-check reason`);
}
const emptyFindings = decidePlan(lastSession, { text: "ok", swelling: "same" }, { video_usable: true, summary: "", findings: [] }, planned);
ok(emptyFindings.decision === "proceed", "usable audit with zero findings → proceed (no -Infinity bug)");

// ── 4. Cached demo audits flow through the rule as the UI would ──────────
section("cached demo audits (data/cache)");
const cache = (n: string) => {
  const f = new URL(`../data/cache/audit-${n}.json`, import.meta.url);
  return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as SquatAudit) : null;
};
const ref = cache("reference");
const side = cache("sideon");
const valgus = cache("valgus");
if (ref) {
  ok(decidePlan(lastSession, demoCheckIn, ref, planned).decision === "deload", "reference cache + demo check-in → deload");
  ok(decidePlan(lastSession, { text: "ok", swelling: "same" }, ref, planned).decision === "proceed", "reference cache (clean form) + swelling same → proceed");
} else ok(false, "data/cache/audit-reference.json exists");
if (side) ok(decidePlan(lastSession, { text: "ok", swelling: "same" }, side, planned).decision === "proceed", "sideon cache (unusable) + swelling same → proceed");
else ok(false, "data/cache/audit-sideon.json exists");
if (valgus) {
  // The recorded sample is whatever Claude really said; the rule must follow its severity either way.
  const maxSev = Math.max(0, ...valgus.findings.map((f) => f.severity));
  const want = maxSev >= 2 ? "deload" : "proceed";
  const p = decidePlan(lastSession, { text: "ok", swelling: "same" }, valgus, planned);
  ok(p.decision === want, `valgus cache (max severity ${maxSev}) + swelling same → ${want}`, p.decision);
  ok(decidePlan(lastSession, { text: "ok", swelling: "more" }, valgus, planned).decision === "deload", "valgus cache + swelling more → deload");
}

// ── 5. Red flags: every category, English + Hinglish ─────────────────────
section("red flags (English + Hinglish, each category)");
const RED: [string, string][] = [
  ["chest pain or breathlessness", "I have chest pain since morning"],
  ["chest pain or breathlessness", "I can’t breathe properly"],
  ["chest pain or breathlessness", "Feeling short of breath"],
  ["chest pain or breathlessness", "Saans phool rahi hai"],
  ["chest pain or breathlessness", "Seene mein dard ho raha hai"],
  ["chest pain or breathlessness", "Chest me dard ho raha hai"],
  ["calf pain or swelling", "My calf is sore and tight"],
  ["calf pain or swelling", "calf mein dard aur sujan hai"],
  ["calf pain or swelling", "Pindli mein dard hai"],
  ["calf pain or swelling", "Some ankle swelling since last night"],
  ["fever or chills", "I have a fever"],
  ["fever or chills", "Temperature 101 since morning"],
  ["fever or chills", "Raat se bukhar hai"],
  ["fever or chills", "Thand lag rahi hai, kaanp raha hoon"],
  ["red, hot knee (possible infection)", "Knee is red and hot today"],
  ["red, hot knee (possible infection)", "Ghutna laal aur garam hai"],
  ["wound redness, discharge or opening", "There is discharge from the incision"],
  ["wound redness, discharge or opening", "Pus coming out near the scar"],
  ["wound redness, discharge or opening", "Taanke khul gaye"],
  ["wound redness, discharge or opening", "Ghaav se mawaad aa raha hai"],
  ["knee locking", "My knee locked and I couldn't move it"],
  ["knee locking", "Knee atak gaya, seedha nahi ho raha"],
  ["knee giving way", "My knee gave way on the stairs"],
  ["knee giving way", "Knee buckled and I heard a pop"],
  ["knee giving way", "Stairs pe knee nikal gaya"],
  ["knee giving way", "Aaj bathroom mein gir gaya"],
  ["can't put weight on the leg", "I cannot walk on it"],
  ["can't put weight on the leg", "I can't put weight on my leg"],
  ["can't put weight on the leg", "Chal nahi pa raha hoon"],
];
for (const [label, t] of RED) {
  const r = checkRedFlags(t);
  ok(r.matched.includes(label), `red flag [${label}]: "${t}"`, `matched ${JSON.stringify(r.matched)}`);
}
// Every category in lib/rules.ts is covered above (catches a new category without a test).
const rulesSrc = readFileSync(new URL("../lib/rules.ts", import.meta.url), "utf8");
const labels = [...rulesSrc.matchAll(/\{ label: "([^"]+)"/g)].map((m) => m[1]);
const covered = new Set(RED.map(([l]) => l));
ok(labels.length > 0 && labels.every((l) => covered.has(l)), `all ${labels.length} red-flag categories have a test`, labels.filter((l) => !covered.has(l)).join("; "));

// Negation over-triggers on purpose (safety first). If this flips, the design changed: update README.
for (const t of ["Bukhar nahi hai", "No fever, no calf pain"]) {
  ok(checkRedFlags(t).hit, `negation still escalates (by design): "${t}"`);
}

// ── 6. False-alarm controls: ordinary rehab talk must NOT stop the flow ──
section("no false alarms on normal rehab phrases");
const SAFE = [
  DEMO_TEXT,
  "Stairs pe thoda khichav hai",
  "Knee feels tight after the bike",
  "Did my calf raises and bridges",
  "Calf raises kiye, 3x15",
  "Walked around the block, took me a while by the clock",
  "Stepped down from the block, felt okay",
  "Clock-wise ankle circles done",
  "Knee thoda swollen hai, ice lagaya",
  "Heel slides aur quad sets ho gaye",
  "Hamstring curls with the red theraband",
  "Stitches removed last week, scar thoda itchy",
  "Squat mein knee andar ja raha tha",
  "Thoda stiff tha subah, ab theek hai",
];
for (const t of SAFE) {
  const r = checkRedFlags(t);
  ok(!r.hit, `no false alarm: "${t}"`, `matched ${JSON.stringify(r.matched)}`);
}

// Regression tests for bugs found by the evals agent and fixed in lib/rules.ts.
// Hard assertions (red/green): each one failed against the pre-fix rules.ts.
section("regressions (fixed bugs, must stay fixed)");
for (const t of [
  "Lock the knee straight during SLR", // common SLR cue, was → "knee locking"
  "Calf stretch done", // was → "calf pain"
  "The wound is healing fine", // bare "wound", was → "wound redness"
  "Chest press at the gym", // bare "chest", was → "chest pain"
]) {
  const r = checkRedFlags(t);
  ok(!r.hit, `regression: no false alarm "${t}"`, r.matched.join(", "));
}
for (const t of ["Pair pe weight nahi daal pa raha"]) {
  // Hinglish "can't bear weight", was missed
  ok(checkRedFlags(t).hit, `regression: red flag caught "${t}"`);
}
// Genuine red flags that the narrower regexes must still catch.
for (const t of ["The wound is red", "Wound se paani nikal raha hai", "Knee locked and won't straighten", "Chest feels tight and saans phool rahi", "Calf is swollen and painful",
  // reviewer-found misses (round 2), written before the fix
  "Knee is stuck, can't straighten it", "Incision is leaking", "High temp since morning", "Shivering at night"]) {
  ok(checkRedFlags(t).hit, `still caught after narrowing: "${t}"`);
}

console.log(`\n${failed ? `${failed} failed` : "all rules tests passed"}${warned ? ` (${warned} warnings)` : ""}`);
process.exit(failed ? 1 : 0);
