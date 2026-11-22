// Runs the deterministic rules engine against data/test-cases.json. `npm test`.
import cases from "../data/test-cases.json" with { type: "json" };
import patient from "../data/patient.json" with { type: "json" };
import { checkRedFlags, decidePlan } from "../lib/rules.ts";
import type { Exercise, Session, Swelling, SquatAudit } from "../lib/types.ts";

let failed = 0;
for (const c of cases) {
  const red = checkRedFlags(c.checkIn.text);
  let ok = red.hit === c.expect.redFlag;
  let got = `redFlag=${red.hit}${red.hit ? ` (${red.matched.join(", ")})` : ""}`;

  if (!red.hit) {
    const yesterday = { ...(patient.sessions.at(-1) as Session), loadIncreased: c.yesterdayLoadIncreased };
    const audit: SquatAudit = {
      video_usable: true,
      summary: "",
      findings: [{ type: "knee_valgus", severity: c.maxSeverity as 0 | 1 | 2 | 3, timestampSec: 1, observation: "", cues: ["", ""] }],
    };
    const plan = decidePlan(yesterday, { text: c.checkIn.text, swelling: c.checkIn.swelling as Swelling }, audit, patient.todayPlan as Exercise[]);
    got += ` decision=${plan.decision}`;
    if ("decision" in c.expect) ok = ok && plan.decision === c.expect.decision;
    if (plan.decision === "deload") ok = ok && !plan.exercises.some((e) => e.kind === "loading");
  }
  console.log(`${ok ? "✔" : "✘"} ${c.name}: ${got}`);
  if (!ok) failed++;
}

// Extra positives (reviewer-found gaps): smart quotes, "cannot", chest, temperature, hot knee.
for (const t of ["I can’t breathe properly", "I cannot walk on it", "Chest me dard ho raha hai", "Temperature 101 since morning", "Knee is red and hot today", "Knee locked, seedha nahi ho raha"]) {
  const r = checkRedFlags(t);
  console.log(`${r.hit ? "✔" : "✘"} red flag caught: "${t}"`);
  if (!r.hit) failed++;
}

// Negative control: an ordinary sentence must not trip a red flag.
for (const t of ["Stairs pe thoda khichav hai", "Knee feels tight after the bike", "Did my calf raises and bridges", "Walked around the block, took me a while by the clock"]) {
  const r = checkRedFlags(t);
  console.log(`${r.hit ? "✘" : "✔"} no false alarm: "${t}"`);
  if (r.hit) failed++;
}

console.log(failed ? `${failed} failed` : "all rules tests passed");
process.exit(failed ? 1 : 0);
