// Tests for the optional Google Health connection (pure parts only, no network). Run via `npm test`.
import {
  healthEnabled, seal, unseal, stateMatches, mapDailyRollup, mergeActivity, authUrl, rollupRange, isIsoDate,
} from "../lib/health.ts";
import { activity } from "../lib/activity.ts";

let failed = 0;
const ok = (cond: boolean, name: string, detail = "") => {
  console.log(`${cond ? "✔" : "✘"} ${name}${!cond && detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
};

console.log("# health");
const KEY = "test-key-0123456789-0123456789-abcdef"; // fake, test only
const full = { GOOGLE_HEALTH_CLIENT_ID: "x", GOOGLE_HEALTH_CLIENT_SECRET: "y", GOOGLE_HEALTH_COOKIE_KEY: KEY };
ok(healthEnabled(full) === true, "enabled when all three vars set");
for (const k of Object.keys(full) as (keyof typeof full)[]) {
  ok(healthEnabled({ ...full, [k]: "" }) === false, `disabled when ${k} missing`);
}
ok(healthEnabled({ ...full, GOOGLE_HEALTH_COOKIE_KEY: "short" }) === false, "disabled when cookie key < 32 chars");
ok(healthEnabled({}) === false, "disabled with empty env");

const sealed = seal("token-abc", KEY);
ok(typeof sealed === "string" && !sealed.includes("token-abc"), "sealed value hides the token");
ok(unseal(sealed, KEY) === "token-abc", "cookie round-trip");
ok(seal("token-abc", KEY) !== sealed, "random IV: two seals differ");
const buf = Buffer.from(sealed, "base64url");
buf[buf.length - 1] ^= 1;
ok(unseal(buf.toString("base64url"), KEY) === null, "tampered cookie -> null");
ok(unseal(sealed, KEY + "x") === null, "wrong key -> null");
ok(unseal("garbage", KEY) === null && unseal(undefined, KEY) === null, "garbage / missing -> null");

ok(stateMatches("abc123", "abc123") === true, "state match");
ok(stateMatches("abc123", "abc124") === false, "state mismatch");
ok(stateMatches(undefined, "abc") === false && stateMatches("abc", null) === false && stateMatches("", "") === false, "missing state -> false");

const u = new URL(authUrl("http://localhost:3005", "st8", "cid"));
ok(u.origin + u.pathname === "https://accounts.google.com/o/oauth2/v2/auth", "auth endpoint");
ok(u.searchParams.get("scope") === "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly", "read-only activity scope only");
ok(u.searchParams.get("redirect_uri") === "http://localhost:3005/api/health/callback", "redirect uri");
ok(u.searchParams.get("state") === "st8" && u.searchParams.get("response_type") === "code" && u.searchParams.get("access_type") === "online", "state, code flow, online");

ok(isIsoDate("2026-11-22") && !isIsoDate("2026-11-2") && !isIsoDate("x"), "date validation");
const r = rollupRange("2026-11-01");
ok(JSON.stringify(r.start.date) === JSON.stringify({ year: 2026, month: 10, day: 31 }), "range starts yesterday (month rollover)", JSON.stringify(r));
ok(JSON.stringify(r.end.date) === JSON.stringify({ year: 2026, month: 11, day: 2 }), "range ends tomorrow (exclusive)", JSON.stringify(r));

// Fixture in the documented dailyRollUp response shape (rollupDataPoints[].steps.countSum is an int64 string).
const d = (day: number) => ({ date: { year: 2026, month: 11, day }, time: { hours: 0 } });
const fixture = {
  rollupDataPoints: [
    { civilStartTime: d(21), civilEndTime: d(22), steps: { countSum: "9240" } },
    { civilStartTime: d(22), civilEndTime: d(23), steps: { countSum: "3120" } },
  ],
};
ok(JSON.stringify(mapDailyRollup(fixture, "2026-11-22")) === JSON.stringify({ stepsToday: 3120, stepsYesterday: 9240 }), "maps rollup to today/yesterday", JSON.stringify(mapDailyRollup(fixture, "2026-11-22")));
ok(JSON.stringify(mapDailyRollup({ rollupDataPoints: [] }, "2026-11-22")) === JSON.stringify({ stepsToday: 0, stepsYesterday: 0 }), "no data -> zeros");
ok(mapDailyRollup({ nope: 1 }, "2026-11-22") === null && mapDailyRollup(null, "2026-11-22") === null, "unexpected shape -> null");

const m = mergeActivity(activity, { stepsToday: 1500, stepsYesterday: 8000, activeMinutesToday: 12 });
ok(m.sample === false && m.source === "Google Health", "merged is marked live");
ok(m.today.steps === 1500 && m.yesterday.steps === 8000 && m.today.activeMinutes === 12, "real numbers overlaid");
ok(m.week[m.week.length - 1].steps === 1500 && m.week[m.week.length - 2].steps === 8000, "last two week bars updated");
ok(m.today.restingHr === activity.today.restingHr && activity.today.steps === 3120 && activity.sample === true, "other fields kept, sample untouched");

if (failed) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
