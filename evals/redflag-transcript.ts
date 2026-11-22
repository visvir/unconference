// Usage: node --experimental-strip-types evals/redflag-transcript.ts "<transcript>"  (no API calls)
import { checkRedFlags } from "../lib/rules.ts";
for (const t of process.argv.slice(2)) console.log(JSON.stringify(t), checkRedFlags(t));
