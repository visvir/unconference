// Deterministic safety logic. The model never decides any of this.
import type { CheckIn, DailyPlan, Exercise, RedFlagResult, Session, SquatAudit } from "./types";

// Red flags (English + Hinglish). Errs on the side of caution: negations ("bukhar nahi") still match.
const RED_FLAGS: { label: string; re: RegExp }[] = [
  { label: "chest pain or breathlessness", re: /chest(?!\s*(press|fly|flies|day|workout|stretch))|breathless|short(ness)? of breath|(can[’']?t|cannot|can not) breathe|saans|seene/i },
  { label: "calf pain or swelling", re: /calf(?!\s*(raise|stretch))|pindli|ankle swell/i },
  { label: "fever or chills", re: /fever|temperature|\btemp\b|bukhar|chills|shiver\w*|kaanp|thand lag/i },
  { label: "red, hot knee (possible infection)", re: /(knee|ghutn[ae]).{0,20}\b(red|laal|garam|hot)\b|\b(red|laal|garam|hot)\b.{0,20}(knee|ghutn[ae])/i },
  { label: "wound redness, discharge or opening", re: /discharge|\bpus\b|mawaad|oozing|stitches? (open|came)|taanke khul|(wound|incision|scar|cut|ghaav|zakhm|taanke).{0,25}\b(red|laal|pus|ooz\w*|leak\w*|open\w*|khul\w*|garam|hot|smell\w*|badbu|swollen|paani|khoon|bleed\w*)|\b(red|laal|garam|hot|smelly|swollen)\b.{0,20}(wound|incision|scar|ghaav|zakhm)/i },
  { label: "knee locking", re: /\block(ed|ing|s)?\b(?!\s+(the|your|my)?\s*(knee|leg|it)?\s*(straight|out))|\bstuck\b|(can[’']?t|cannot|can not) straighten|atak gaya|seedha nahi ho/i },
  { label: "knee giving way", re: /giv(e|es|ing) way|gave way|buckl|knee nikal|mud gaya|gir gaya|\bpop(ped)?\b/i },
  { label: "can't put weight on the leg", re: /(can[’']?t|cannot|can not) (put (any )?)?(weight|walk|stand)|chal nahi pa|weight nahi (daal|de)|pair (zameen )?pe (nahi )?rakh nahi/i },
];

export function checkRedFlags(text: string): RedFlagResult {
  const matched = RED_FLAGS.filter((f) => f.re.test(text)).map((f) => f.label);
  return { hit: matched.length > 0, matched };
}

// Kept on a deload day (spec: heel slides, quad sets, straight-leg raises, ice + elevation).
const DELOAD_KEEP = new Set(["heel_slides", "quad_sets", "slr", "ice"]);

export function decidePlan(
  yesterday: Session,
  checkIn: CheckIn,
  audit: SquatAudit | null,
  planned: Exercise[],
): DailyPlan {
  const maxSev = audit?.video_usable ? Math.max(0, ...audit.findings.map((f) => f.severity)) : 0;
  const worst = audit?.findings.find((f) => f.severity === maxSev);

  const reasons: string[] = [];
  if (yesterday.loadIncreased) reasons.push(`Load went up yesterday (${yesterday.note ?? "progressed exercises"})`);
  if (checkIn.swelling === "more") reasons.push("Swelling is more than yesterday");
  if (maxSev >= 2 && worst) reasons.push(`Form check: ${worst.type.replace("_", " ")} severity ${maxSev}/3`);

  const deload = yesterday.loadIncreased && (checkIn.swelling === "more" || maxSev >= 2);

  if (!deload) {
    return { decision: "proceed", reasons: reasons.length ? reasons : ["No warning signs today"], exercises: planned, removed: [] };
  }
  return {
    decision: "deload",
    reasons,
    exercises: planned.filter((e) => DELOAD_KEEP.has(e.id)),
    removed: planned.filter((e) => !DELOAD_KEEP.has(e.id)),
  };
}
