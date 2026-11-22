// Owner lock for the paid AI routes. `npm test` runs this.
import { codeMatches, liveDecision, tokenFor } from "../lib/guard.ts";

let failed = 0;
const ok = (cond: boolean, name: string) => {
  console.log(`${cond ? "✔" : "✘"} ${name}`);
  if (!cond) failed++;
};

const CODE = "correct horse battery staple 42";
const good = tokenFor(CODE);

console.log("# owner lock");
ok(liveDecision({ production: true, code: undefined, cookie: undefined }) === false, "production, no passcode configured → locked (fails closed)");
ok(liveDecision({ production: true, code: "", cookie: good }) === false, "production, empty passcode → locked even with a cookie");
ok(liveDecision({ production: true, code: CODE, cookie: undefined }) === false, "production, no cookie → locked");
ok(liveDecision({ production: true, code: CODE, cookie: "nonsense" }) === false, "production, wrong cookie → locked");
ok(liveDecision({ production: true, code: CODE, cookie: tokenFor("other passcode value") }) === false, "production, cookie from another passcode → locked");
ok(liveDecision({ production: true, code: CODE, cookie: good }) === true, "production, right cookie → live");
ok(liveDecision({ production: false, code: undefined, cookie: undefined }) === true, "local development → live (no lock on your own laptop)");
ok(good !== CODE && /^[0-9a-f]{64}$/.test(good), "the cookie never contains the passcode itself");
ok(codeMatches(CODE, CODE) === true, "right passcode matches");
ok(codeMatches(CODE, CODE + "x") === false && codeMatches(CODE, "") === false, "wrong or empty passcode does not match");
ok(codeMatches("short", "short") === false, "a passcode under 12 characters is refused as too weak");

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
