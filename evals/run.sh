#!/usr/bin/env bash
# evals/run.sh — the demo's eval gate (see "Eval cases" in DEMO.md). verify.sh runs it.
#
#   evals/run.sh                                  fast (< 60 s), no model calls: pages, demo-mode APIs, rules
#   BASE=http://localhost:3005 evals/run.sh       against a local server
#   EVAL_LIVE=1 evals/run.sh                      + live Claude calls (costs money, ~20 s, runs in parallel)
#
# Plain bash + curl; JSON assertions via node -e. Exit 1 on any failure.

set -uo pipefail
cd "$(dirname "$0")/.."
[[ -f .hackathon/env ]] && source .hackathon/env
BASE=${BASE:-${SMOKE_URL:-https://unconference-ruby.vercel.app}}
BASE=${BASE%/}

# Fail fast if the target is unreachable (venue Wi-Fi), instead of ~17 slow timeouts.
if ! curl -sS --max-time 8 -o /dev/null "$BASE/" 2>/dev/null; then
  echo "  ✘ $BASE unreachable (network down?). Run against local: BASE=http://localhost:3005 evals/run.sh"
  exit 1
fi
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
START=$SECONDS
echo "evals against $BASE"

pass=0; fail=0; warn=0
ok()   { pass=$((pass+1)); echo "  ✔ $1"; }
bad()  { fail=$((fail+1)); echo "  ✘ $1 — $2"; }
note() { warn=$((warn+1)); echo "  ⚠ WARN $1"; }

check() {  # check <name> <expected-substring> <command...>
  local name=$1 expected=$2; shift 2
  local out; out=$("$@" 2>&1)
  if [[ "$out" == *"$expected"* ]]; then ok "$name"; else bad "$name" "expected '$expected', got: ${out:0:200}"; fi
}

# req <out-file> <path> [json-body]  → prints HTTP status (000 on network error); body saved to out-file
req() {
  local out=$1 path=$2 body=${3:-}
  if [[ -n "$body" ]]; then
    curl -sS --max-time "${REQ_TIMEOUT:-10}" -o "$out" -w '%{http_code}' -X POST -H 'content-type: application/json' --data-binary "$body" "$BASE$path" 2>/dev/null || true
  else
    curl -sS --max-time "${REQ_TIMEOUT:-10}" -o "$out" -w '%{http_code}' "$BASE$path" 2>/dev/null || true
  fi
}

# status <name> <expected-code> <actual-code> <body-file>
status() { [[ "$3" == "$2" ]] && ok "$1" || bad "$1" "HTTP $3 (want $2): $(head -c 160 "$4" 2>/dev/null)"; }

# jcheck <name> <json-file> <js>  — js sees `j` (parsed JSON); returns true, or a string explaining the failure
jcheck() {
  local name=$1 file=$2 js=$3 out
  out=$(node -e '
    const fs = require("fs");
    let j; try { j = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch (e) { console.log("not JSON: " + fs.readFileSync(process.argv[1], "utf8").slice(0, 120)); process.exit(0); }
    let r; try { r = (new Function("j", process.argv[2]))(j); } catch (e) { r = "threw: " + e.message; }
    console.log(r === true ? "OK" : String(r || "assertion false"));
  ' "$file" "$js" 2>&1)
  [[ "$out" == "OK" ]] && ok "$name" || bad "$name" "${out:0:200}"
}

# Shared JS: the audit response contract the UI depends on.
AUDIT_SHAPE='
  if (typeof j.video_usable !== "boolean") return "video_usable not boolean";
  if (!Array.isArray(j.findings)) return "findings not an array";
  if (typeof j.summary !== "string") return "summary not a string";
  for (const f of j.findings) {
    if (!["knee_valgus","trunk_lean","pelvic_drop"].includes(f.type)) return "bad type " + f.type;
    if (!Number.isInteger(f.severity) || f.severity < 0 || f.severity > 3) return "bad severity " + f.severity;
    if (typeof f.timestampSec !== "number" || f.timestampSec < 0 || f.timestampSec > 15) return "bad timestampSec " + f.timestampSec;
    if (!Array.isArray(f.cues) || f.cues.length !== 2 || f.cues.some(c => typeof c !== "string" || !c.trim())) return "cues must be exactly 2 non-empty strings";
    if (typeof f.observation !== "string" || !f.observation.trim()) return "empty observation";
  }
  if (!j.video_usable && j.findings.length) return "unusable video must have no findings";
  if (!j.video_usable && !(j.unusable_reason || "").trim()) return "unusable video needs a reason";
  return true;'

# ── 1. Pages (static shell copy; client pages render their headings server-side) ──
echo "pages"
code=$(req "$TMP/home.html" "/")
status "GET / → 200" 200 "$code"
check "home shows patient + Knee bend chart" "Knee bend" cat "$TMP/home.html"
check "home shows seeded patient name"      "Arjun"     cat "$TMP/home.html"
code=$(req "$TMP/audit.html" "/audit?demo=1")
status "GET /audit → 200" 200 "$code"
check "audit page: Squat form check"  "Squat form check" cat "$TMP/audit.html"
code=$(req "$TMP/checkin.html" "/checkin?demo=1")
status "GET /checkin → 200" 200 "$code"
check "checkin page: How's the knee today" "the knee today" cat "$TMP/checkin.html"
check "checkin page: mentions Hinglish"    "Hinglish"       cat "$TMP/checkin.html"

# Every demo sample in lib/flow.ts is served and has a cached audit (catches drift between UI and cache).
SAMPLES=$(grep -v ROM_SAMPLE lib/flow.ts | grep -oE 'id: "[a-z0-9_-]+"' | cut -d'"' -f2)
for s in $SAMPLES; do
  code=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' -r 0-1023 "$BASE/samples/$s.mp4" 2>/dev/null || true)
  [[ "$code" == "200" || "$code" == "206" ]] && ok "sample video /samples/$s.mp4 served" || bad "sample video /samples/$s.mp4 served" "HTTP $code"
  [[ -f "data/cache/audit-$s.json" ]] && ok "sample '$s' has data/cache/audit-$s.json" || bad "sample '$s' has a cached audit" "missing data/cache/audit-$s.json (demo mode would 404)"
done

# ── 2. /api/audit demo mode (cached, zero model calls) ──────────────────
echo "api/audit (demo mode)"
code=$(req "$TMP/ref.json" /api/audit '{"sample":"reference"}')
status "audit sample=reference → 200" 200 "$code"
jcheck "audit reference: response contract" "$TMP/ref.json" "$AUDIT_SHAPE"
jcheck "audit reference: usable, 3 findings (one per type), all ≤ 1, cached" "$TMP/ref.json" '
  if (!j.video_usable) return "reference should be usable";
  const t = j.findings.map(f => f.type).sort().join();
  if (t !== "knee_valgus,pelvic_drop,trunk_lean") return "types " + t;
  if (j.findings.some(f => f.severity > 1)) return "good-form sample has severity > 1";
  return j.cached === true || "not served from cache";'

code=$(req "$TMP/side.json" /api/audit '{"sample":"sideon"}')
status "audit sample=sideon → 200" 200 "$code"
jcheck "audit sideon: response contract" "$TMP/side.json" "$AUDIT_SHAPE"
jcheck "audit sideon: unusable + re-record reason, no findings" "$TMP/side.json" '
  return (j.video_usable === false && j.unusable_reason.trim().length > 20 && j.findings.length === 0) || "got usable=" + j.video_usable + " reason=" + JSON.stringify(j.unusable_reason);'

# Only checked when a knee-caving sample is bundled (the founder's clip was removed from the public repo for privacy).
if [[ -f data/cache/audit-valgus.json ]]; then
  code=$(req "$TMP/valgus.json" /api/audit '{"sample":"valgus"}')
  status "audit sample=valgus → 200" 200 "$code"
  jcheck "audit valgus: response contract" "$TMP/valgus.json" "$AUDIT_SHAPE"
  jcheck "audit valgus: usable, knee_valgus ≥ 2 with a timestamp and cues (the demo's key moment)" "$TMP/valgus.json" '
    if (j.video_usable !== true) return "not usable";
    const k = j.findings.find(f => f.type === "knee_valgus");
    return (k && k.severity >= 2 && k.timestampSec > 0 && k.cues.every(c => c.length > 3)) || "no knee_valgus finding ≥ 2: " + JSON.stringify(j.findings.map(f => [f.type, f.severity]));'
fi

code=$(req "$TMP/nope.json" /api/audit '{"sample":"does-not-exist"}')
status "audit unknown sample → 404" 404 "$code"
code=$(req "$TMP/e0.json" /api/audit '{"frames":[]}')
status "audit 0 frames → 400" 400 "$code"
code=$(req "$TMP/e1.json" /api/audit '{}')
status "audit no frames field → 400" 400 "$code"
# Hardening (architect review): malformed input must be a 400, never a 500 or a paid model call.
code=$(req "$TMP/h1.json" /api/audit '{"frames":[{"data":"abc"}]}')
status "audit frame missing t → 400" 400 "$code" "$TMP/h1.json"
code=$(req "$TMP/h2.json" /api/audit '{"frames":[{"t":"1","data":123}]}')
status "audit frame wrong types → 400" 400 "$code" "$TMP/h2.json"
big=$(head -c 1200000 /dev/zero | tr '\0' 'A')
printf '{"frames":[{"t":1,"data":"%s"}]}' "$big" > "$TMP/h3-body.json"
code=$(REQ_TIMEOUT=30 req "$TMP/h3.json" /api/audit "@$TMP/h3-body.json")
status "audit oversized frame (>1 MB) → 400" 400 "$code" "$TMP/h3.json"
code=$(req "$TMP/h4.json" /api/explain '{"decision":"maybe"}')
status "explain invalid body → 400" 400 "$code" "$TMP/h4.json"
code=$(req "$TMP/h5.json" /api/explain 'not json')
status "explain non-JSON → 400" 400 "$code" "$TMP/h5.json"
F13=$(node -e 'console.log(JSON.stringify({frames: Array.from({length: 13}, (_, i) => ({t: i * 0.3, data: "AAAA"})), leg: "right"}))')
code=$(req "$TMP/e13.json" /api/audit "$F13")
status "audit 13 frames → 400 (no model call)" 400 "$code"
jcheck "audit 400 carries an error message" "$TMP/e13.json" 'return typeof j.error === "string" && j.error.length > 0 || "no error field";'

# ── 3. /api/explain demo mode ───────────────────────────────────────────
echo "api/explain (demo mode)"
EXPLAIN_DEMO='{"demo":true,"decision":"deload","checkInText":"Kal squats badhaye the, aaj knee thoda swollen aur stairs pe khichav","reasons":["Load went up yesterday","Swelling is more than yesterday"],"kept":["Heel slides","Quad sets","Straight-leg raises","Ice + elevation"],"removed":["Bodyweight squats (two-leg)","Stationary bike"]}'
code=$(req "$TMP/ex.json" /api/explain "$EXPLAIN_DEMO")
status "explain demo deload → 200" 200 "$code"
jcheck "explain demo deload: non-empty explanation, cached, no markdown" "$TMP/ex.json" '
  const e = (j.explanation || "").trim();
  if (e.length < 20) return "explanation empty/short: " + JSON.stringify(e);
  if (/[*#`]/.test(e)) return "contains markdown";
  return j.cached === true || "not served from cache (demo mode hit the model)";'
# Demo cache must only answer the scripted example; anything typed by a judge goes live (one cheap Sonnet call).
EXPLAIN_EN='{"demo":true,"decision":"deload","checkInText":"My knee is a bit swollen after the squats yesterday","reasons":["Load went up yesterday","Swelling is more than yesterday"],"kept":["Heel slides","Quad sets"],"removed":["Bodyweight squats (two-leg)"]}'
code=$(REQ_TIMEOUT=25 req "$TMP/ex-en.json" /api/explain "$EXPLAIN_EN")
status "explain demo + typed English → 200" 200 "$code"
jcheck "explain demo + typed English: NOT the cached Hinglish note" "$TMP/ex-en.json" 'return j.cached !== true || "served the canned cache for non-example text";'


# ── 4. Rules engine (deterministic safety logic) ────────────────────────
echo "rules engine"
if out=$(npm test --silent 2>&1); then
  ok "npm test: $(grep -c '^✔' <<<"$out") rule checks passed"
else
  bad "npm test (rules engine)" "$(grep '^✘' <<<"$out" | head -5 | tr '\n' ' ')"
fi
while IFS= read -r l; do l=${l#⚠ }; note "rules: ${l#WARN }"; done < <(grep '^⚠' <<<"$out")

# transcribe without audio → 400 (no paid call)
code=$(curl -sS --max-time 10 -o "$TMP/tr-noaudio.json" -w '%{http_code}' -X POST -H 'content-type: application/json' --data-binary '{}' "$BASE/api/transcribe" 2>/dev/null || true)
status "transcribe without audio → 400" 400 "$code" "$TMP/tr-noaudio.json"

# ── 5. LIVE model evals (EVAL_LIVE=1; real Claude calls, cost money) ────
if [[ "${EVAL_LIVE:-0}" == "1" ]]; then
  echo "LIVE model evals"
  if ! command -v ffmpeg >/dev/null || ! command -v ffprobe >/dev/null; then
    bad "live: ffmpeg/ffprobe installed" "needed by scripts/frames.py"
  else
    python3 -I scripts/frames.py public/samples/reference.mp4 "$TMP/f-ref.json" && \
    python3 -I scripts/frames.py public/samples/sideon.mp4 "$TMP/f-side.json" || bad "live: extract frames" "scripts/frames.py failed"
    LIVE_TEXT="Kal squats badhaye the, aaj knee thoda swollen aur stairs pe khichav"
    LIVE_EXPLAIN=$(node -e 'console.log(JSON.stringify({checkInText: process.argv[1], decision: "deload",
      reasons: ["Load went up yesterday (Progressed from mini squats to bodyweight squats, 3x10)", "Swelling is more than yesterday"],
      kept: ["Heel slides", "Quad sets", "Straight-leg raises", "Ice + elevation"],
      removed: ["Bodyweight squats (two-leg)", "Stationary bike"]}))' "$LIVE_TEXT")
    # Fire all three in parallel to keep wall time ≈ the slowest call.
    T0=$SECONDS
    REQ_TIMEOUT=70 req "$TMP/l-ref.json"  /api/audit "@$TMP/f-ref.json"  > "$TMP/c-ref"  &
    REQ_TIMEOUT=70 req "$TMP/l-side.json" /api/audit "@$TMP/f-side.json" > "$TMP/c-side" &
    REQ_TIMEOUT=40 req "$TMP/l-ex.json"   /api/explain "$LIVE_EXPLAIN"   > "$TMP/c-ex"   &
    wait
    echo "  (live calls took $((SECONDS - T0)) s)"
    status "live audit reference → 200" 200 "$(cat "$TMP/c-ref")" "$TMP/l-ref.json"
    jcheck "live audit reference: response contract" "$TMP/l-ref.json" "$AUDIT_SHAPE"
    jcheck "live audit reference: usable, one finding per type, all severities ≤ 1" "$TMP/l-ref.json" '
      if (!j.video_usable) return "marked unusable: " + j.unusable_reason;
      const t = j.findings.map(f => f.type).sort().join();
      if (t !== "knee_valgus,pelvic_drop,trunk_lean") return "types " + t;
      return j.findings.every(f => f.severity <= 1) || "good form flagged: " + JSON.stringify(j.findings.map(f => [f.type, f.severity]));'
    status "live audit sideon → 200" 200 "$(cat "$TMP/c-side")" "$TMP/l-side.json"
    jcheck "live audit sideon: response contract" "$TMP/l-side.json" "$AUDIT_SHAPE"
    jcheck "live audit sideon: unusable with a re-record reason" "$TMP/l-side.json" '
      return j.video_usable === false || "side-on clip accepted as usable: " + JSON.stringify(j.findings.map(f => [f.type, f.severity]));'
    status "live explain → 200" 200 "$(cat "$TMP/c-ex")" "$TMP/l-ex.json"
    jcheck "live explain: non-empty, ≤ 3 sentences, Hinglish, no markdown" "$TMP/l-ex.json" '
      const e = (j.explanation || "").trim();
      if (!e) return "empty explanation (model call failed? check Vercel logs / ANTHROPIC_API_KEY)";
      const n = e.split(/(?<=[.!?।])\s+/).filter(s => s.trim()).length;
      if (n > 3) return n + " sentences: " + e;
      if (/[*#`]/.test(e)) return "markdown: " + e;
      if (!/\b(aaj|kal|hai|hain|karo|karna|ke|ki|mein|aur)\b/i.test(e)) return "not Hinglish: " + e;
      return true;'
    # A removed exercise may be named only to say skip it, never recommended. Sentence-level check.
    jcheck "live explain: removed exercises only mentioned as skipped" "$TMP/l-ex.json" '
      const e = (j.explanation || "");
      const sentences = e.split(/(?<=[.!?।])\s+/);
      const removed = [/\bsquats?\b/i, /\bbike\b|cycl/i];
      const skip = /skip|avoid|nahi|na kar|mat|drop|hata|chhod|rest|band|no |not |remove|rok|pause|lighter|aaram/i;
      for (const s of sentences) for (const r of removed) if (r.test(s) && !skip.test(s)) return "removed exercise recommended? " + s;
      return true;'
  fi
else
  echo "live model evals skipped (EVAL_LIVE=1 to run)"
fi

# ── rom (knee bend from a photo): no paid calls ─────────────────────────
code=$(req "$TMP/rom.json" /api/rom '{"sample":"sample"}')
status "rom sample → 200" 200 "$code" "$TMP/rom.json"
jcheck "rom sample: response contract" "$TMP/rom.json" '
  if (typeof j.photo_usable !== "boolean") return "photo_usable not boolean";
  if (!j.photo_usable) return true;
  if (!Number.isInteger(j.flexionDeg) || j.flexionDeg % 5 !== 0 || j.flexionDeg < 0 || j.flexionDeg > 160) return "flexionDeg " + j.flexionDeg;
  if (!["low","medium","high"].includes(j.confidence)) return "confidence " + j.confidence;
  return (typeof j.observation === "string" && j.observation.trim().length > 0) || "empty observation";'
code=$(req "$TMP/rom-nope.json" /api/rom '{"sample":"does-not-exist"}')
status "rom unknown sample → 404" 404 "$code" "$TMP/rom-nope.json"
code=$(req "$TMP/rom-e0.json" /api/rom '{}')
status "rom empty body → 400" 400 "$code" "$TMP/rom-e0.json"
code=$(req "$TMP/rom-e1.json" /api/rom 'not json')
status "rom non-JSON → 400" 400 "$code" "$TMP/rom-e1.json"
rbig=$(head -c 1600000 /dev/zero | tr '\0' 'A')
printf '{"image":"%s"}' "$rbig" > "$TMP/rom-big-body.json"
code=$(REQ_TIMEOUT=30 req "$TMP/rom-big.json" /api/rom "@$TMP/rom-big-body.json")
status "rom oversized image (>1.5 MB) → 400" 400 "$code" "$TMP/rom-big.json"
code=$(req "$TMP/rom-page.html" /rom)
status "GET /rom → 200" 200 "$code" "$TMP/rom-page.html"
check "rom page has its title" "Knee bend from a photo" cat "$TMP/rom-page.html"

# Progress hub: the landing CTA goes here; it must link to both checks.
check "check-my-progress hub links to squat form and knee bend" "/rom" bash -c "curl -fsS --max-time 10 '$BASE/check' | grep -o 'href=\"/audit[^\"]*\"\|href=\"/rom[^\"]*\"' | sort -u | tr '\n' ' '"
check "home CTA is Check my progress" "Check my progress" curl -fsS --max-time 10 "$BASE/"
# Mentor-feedback features: physio notes, live coach, activity widget.
code=$(req "$TMP/notes.json" /api/notes '{"sample":"sample"}')
status "notes sample → 200" 200 "$code" "$TMP/notes.json"
jcheck "notes sample: cached, usable, instructions with quotes" "$TMP/notes.json" '
  if (j.cached !== true || j.usable !== true) return "not cached/usable";
  if (!Array.isArray(j.instructions) || j.instructions.length < 3) return "too few instructions";
  const bad = j.instructions.find(i => !["add","remove","change","caution"].includes(i.action) || !i.quote);
  return bad ? "bad instruction " + JSON.stringify(bad) : true;'
code=$(req "$TMP/notes-bad.json" /api/notes '{"text":"hi"}')
status "notes too-short text → 400" 400 "$code" "$TMP/notes-bad.json"
check "notes page has its title" "Physio" curl -fsS --max-time 10 "$BASE/notes"
code=$(req "$TMP/live.html" "/live?demo=1")
status "GET /live → 200" 200 "$code" "$TMP/live.html"
check "live page has its title" "Live squat coach" cat "$TMP/live.html"
check "hub links to the live coach" "/live" curl -fsS --max-time 10 "$BASE/check"
check "home shows the activity widget as sample data" "Sample data" curl -fsS --max-time 10 "$BASE/"
check "home links to physio advice" "Add my physio" curl -fsS --max-time 10 "$BASE/"
# Owner lock: paid routes must refuse the public (production only; local dev is unlocked by design).
if [[ "$BASE" == https://* ]]; then
  F1=$(node -e 'console.log(JSON.stringify({frames:[{t:1,data:"A".repeat(2000)}],leg:"right"}))')
  code=$(req "$TMP/lock-a.json" /api/audit "$F1")
  status "audit with frames, no passcode → 403 locked" 403 "$code" "$TMP/lock-a.json"
  code=$(req "$TMP/lock-r.json" /api/rom "$(node -e 'console.log(JSON.stringify({image:"A".repeat(2000)}))')")
  status "rom with an image, no passcode → 403 locked" 403 "$code" "$TMP/lock-r.json"
  code=$(req "$TMP/lock-n.json" /api/notes '{"text":"Do squats to 45 degrees for this week please."}')
  status "notes with text, no passcode → 403 locked" 403 "$code" "$TMP/lock-n.json"
  code=$(req "$TMP/lock-u.json" /api/unlock '{"code":"definitely-not-the-passcode"}')
  status "unlock with a wrong passcode → 401" 401 "$code" "$TMP/lock-u.json"
  jcheck "explain for the public: no paid call, empty text (page shows its fixed fallback)" "$TMP/ex-en.json" 'return (j.locked === true && j.explanation === "") || "expected locked";'
  hdr=$(curl -sI --max-time 10 "$BASE/" | tr -d "\r" | grep -ciE "^x-frame-options: DENY|^x-content-type-options: nosniff")
  [[ "$hdr" == "2" ]] && ok "security headers present" || bad "security headers present" "found $hdr of 2"
fi
# WhatsApp share redirect: goes to wa.me with the text; the number never appears in the repo or page.
loc=$(curl -sS --max-time 10 -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE/api/share/whatsapp?text=hello%20physio" 2>/dev/null || true)
[[ "$loc" == 302\ https://wa.me/*text=hello%20physio ]] && ok "whatsapp share → 302 to a wa.me chat with the text" || bad "whatsapp share → 302 to a wa.me chat with the text" "$loc"
echo "evals: $pass passed, $fail failed, $warn warnings ($((SECONDS - START)) s)"
[[ $fail -eq 0 ]]
