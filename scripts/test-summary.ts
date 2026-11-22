// Tests for the shareable progress summary and phase lookup. Run via `npm test`.
import patientJson from "../data/patient.json" with { type: "json" };
import { waLink, mailtoLink, currentPhase, progressSummary } from "../lib/summary.ts";
import { parseRom } from "../lib/rom.ts";
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

console.log("\n# waLink");
ok(waLink("9876543210", "hi") === "https://wa.me/919876543210?text=hi", "10-digit Indian number gets 91", waLink("9876543210", "hi"));
ok(waLink("+91 98765 43210", "hi") === "https://wa.me/919876543210?text=hi", "+91 with spaces is cleaned");
ok(waLink("09876543210", "hi") === "https://wa.me/919876543210?text=hi", "leading 0 is dropped");
ok(waLink("", "a b") === "https://wa.me/?text=a%20b", "no number -> contact picker, text encoded");
ok(waLink("14155550123", "hi") === "https://wa.me/14155550123?text=hi", "other country codes are kept");

ok(waLink("+14155550123", "hi") === "https://wa.me/14155550123?text=hi", "+ with 10 digits: no 91", waLink("+14155550123", "hi"));
ok(waLink("+4155550123", "hi") === "https://wa.me/4155550123?text=hi", "+ and exactly 10 digits keeps them, no 91", waLink("+4155550123", "hi"));

console.log("\n# mailtoLink");
const m1 = mailtoLink("a@b.com?cc=x@y.com", "S", "B");
ok(m1.startsWith("mailto:a@b.com?subject=S&body=B") && !m1.includes("cc="), "strips injected header", m1);
ok(mailtoLink("  a@b.com ", "Hi there", "x&y") === "mailto:a@b.com?subject=Hi%20there&body=x%26y", "trim + encode", mailtoLink("  a@b.com ", "Hi there", "x&y"));
ok(mailtoLink("", "S", "B") === "mailto:?subject=S&body=B", "empty address", mailtoLink("", "S", "B"));

console.log("\n# parseRom");
for (const [raw, want] of [["", null], ["  ", null], [null, null], ["abc", null], ["NaN", null], ["-5", null], ["200", null], ["125", 125], ["0", 0]] as const)
  ok(parseRom(raw) === want, `parseRom(${JSON.stringify(raw)}) -> ${want}`, String(parseRom(raw)));

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
