// Tests for applying a physio's structured note to the plan. Run via `npm test`.
import patientJson from "../data/patient.json" with { type: "json" };
import { applyNotes } from "../lib/notes.ts";
import type { Instruction } from "../lib/notes.ts";
import { decidePlan } from "../lib/rules.ts";
import type { PatientData } from "../lib/types.ts";

let failed = 0;
const ok = (cond: boolean, name: string, detail = "") => {
  console.log(`${cond ? "✔" : "✘"} ${name}${!cond && detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
};

const p = patientJson as unknown as PatientData;
const ins = (o: Partial<Instruction> & Pick<Instruction, "action" | "exercise">): Instruction => ({ matchId: "", dose: "", quote: "q", ...o });
const ids = (a: { id: string }[]) => a.map((e) => e.id).join(",");

console.log("# applyNotes");
const rm = applyNotes(p.todayPlan, [ins({ action: "remove", exercise: "squats", matchId: "squats" })]);
ok(!rm.exercises.some((e) => e.id === "squats"), "remove squats: squats gone", ids(rm.exercises));
ok(rm.exercises.length === p.todayPlan.length - 1, "remove squats: others intact");
ok(rm.changes.length === 1 && rm.changes[0].kind === "removed", "remove lists one removed change");

const ch = applyNotes(p.todayPlan, [ins({ action: "change", exercise: "Heel slides", matchId: "heel_slides", dose: "3 × 20" })]);
ok(ch.exercises.find((e) => e.id === "heel_slides")?.dose === "3 × 20", "change heel_slides dose");
ok(ch.changes[0].kind === "changed", "change lists a changed entry");

const ad = applyNotes(p.todayPlan, [ins({ action: "add", exercise: "Hamstring curls", dose: "3 × 10" })]);
const added = ad.exercises[ad.exercises.length - 1];
ok(added.name === "Hamstring curls" && added.dose === "3 × 10" && added.kind === "loading" && added.id === "physio_hamstring_curls", "add appends a loading exercise", JSON.stringify(added));
ok(ad.changes[0].kind === "added", "add lists an added entry");
ok(applyNotes(ad.exercises, [ins({ action: "add", exercise: "hamstring curls", dose: "1 × 1" })]).exercises.length === ad.exercises.length, "add skips an exercise that already exists");

const ca = applyNotes(p.todayPlan, [ins({ action: "caution", exercise: "Ice", quote: "ice after every session" })]);
ok(ids(ca.exercises) === ids(p.todayPlan), "caution: exercises unchanged");
ok(ca.changes.length === 1 && ca.changes[0].kind === "caution", "caution: one caution change");

const un = applyNotes(p.todayPlan, [ins({ action: "remove", exercise: "Jumping", matchId: "nope" })]);
ok(ids(un.exercises) === ids(p.todayPlan), "unknown matchId remove: nothing removed");
ok(un.changes[0]?.kind === "caution" && un.changes[0].text === "Physio says to stop: Jumping", "unknown remove listed as caution", JSON.stringify(un.changes));

const before = JSON.stringify(p.todayPlan);
const copy = p.todayPlan.slice();
applyNotes(p.todayPlan, [ins({ action: "remove", exercise: "x", matchId: "squats" }), ins({ action: "change", exercise: "x", matchId: "slr", dose: "9" }), ins({ action: "add", exercise: "Y", dose: "1" })]);
ok(JSON.stringify(p.todayPlan) === before && p.todayPlan.length === copy.length, "input not mutated");

console.log("\n# safety rule still wins");
const base = applyNotes(p.todayPlan, [ins({ action: "add", exercise: "Hamstring curls", dose: "3 × 10" })]);
const yesterday = { ...p.sessions[p.sessions.length - 1], loadIncreased: true };
const plan = decidePlan(yesterday, { text: "knee swollen", swelling: "more" }, null, base.exercises);
ok(plan.decision === "deload", "deload fires");
ok(!plan.exercises.some((e) => e.kind === "loading"), "no loading exercise survives, including a physio-added one", ids(plan.exercises));
ok(plan.removed.some((e) => e.id === "physio_hamstring_curls"), "physio-added exercise appears in removed", ids(plan.removed));

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
