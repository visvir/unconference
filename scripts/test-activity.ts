// Tests for the sample wearable activity helpers. Run via `npm test`.
import { activity, activityInsight, activityLine } from "../lib/activity.ts";
import type { Activity } from "../lib/activity.ts";

let failed = 0;
const ok = (cond: boolean, name: string, detail = "") => {
  console.log(`${cond ? "✔" : "✘"} ${name}${!cond && detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
};
const withYesterday = (steps: number): Activity => ({ ...activity, yesterday: { ...activity.yesterday, steps } });

console.log("# activity");
const w = activityInsight(activity);
ok(w.tone === "watch", "seeded data -> watch", w.tone);
ok(w.text.includes("9,240"), "text has 9,240", w.text);
ok(w.text === "Yesterday was a big day on your feet (9,240 steps). That counts as extra load on the knee, so go by how it feels today.", "watch text exact", w.text);
const n = activityInsight(withYesterday(8399));
ok(n.tone === "neutral" && n.text === "Daily activity is within your usual range.", "just under 1.4x goal -> neutral", JSON.stringify(n));
ok(activityInsight(withYesterday(8400)).tone === "watch", "exactly 1.4x goal -> watch");
ok(activityLine(activity) === "Activity yesterday: 9,240 steps, 52 active min (Google Health, sample data).", "activityLine exact", activityLine(activity));
ok(activity.sample === true, "data flagged as sample");

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
