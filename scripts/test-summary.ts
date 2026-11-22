// Tests for the shareable progress summary and phase lookup. Run via `npm test`.
import patientJson from "../data/patient.json" with { type: "json" };
import { currentPhase, progressSummary } from "../lib/summary.ts";
import type { PatientData, SquatAudit } from "../lib/types.ts";

let failed = 0;
const ok = (cond: boolean, name: string, detail = "") => {
  console.log(`${cond ? "✔" : "✘"} ${name}${!cond && detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
};

const p = patientJson as unknown as PatientData;
const audit = (valgus: number, usable = true): SquatAudit => ({
  video_usable: usable,
  summary: "",
  findings: [
    { type: "knee_valgus", severity: valgus as 0 | 1 | 2 | 3, timestampSec: 1, observation: "", cues: ["", ""] },
    { type: "trunk_lean", severity: 0, timestampSec: 1, observation: "", cues: ["", ""] },
  ],
});

console.log("# summary");
const s = progressSummary(p, null);
for (const t of ["week 10", "123°", "up 19°", "4 of 6"]) ok(s.includes(t), `contains "${t}"`, s);
ok(!s.includes("Form check"), "null audit: no Form check line");
ok(s.length <= 700, "length <= 700", String(s.length));
const a = progressSummary(p, audit(2));
ok(a.includes("Form check today: knee caving inward 2/3"), "usable audit lists knee caving inward 2/3", a);
ok(a.length <= 700, "with audit length <= 700", String(a.length));
ok(progressSummary(p, audit(0)).includes("no issues seen"), "all zero: no issues seen");
ok(!progressSummary(p, audit(2, false)).includes("Form check"), "unusable audit: no Form check line");

console.log("\n# currentPhase");
ok(currentPhase(p)?.label === "Build strength", "week 10 -> Build strength", String(currentPhase(p)?.label));
const w1 = { ...p, profile: { ...p.profile, weeksPostOp: 1 } };
ok(currentPhase(w1)?.label === "Protect and settle", "week 1 -> Protect and settle");

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
