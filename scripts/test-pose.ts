// Tests for the live squat coach's pure judgement logic (lib/pose.ts). Run via `npm test`.
// Synthetic front-view poses, unmirrored: the person's RIGHT side appears on the image LEFT (smaller x).
import {
  angleDeg, kneeFlexion, framing, valgusRatio, weightShift, assess, RepCounter, smooth,
  L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE,
  type Landmarks, type Pt,
} from "../lib/pose.ts";

let failed = 0;
const ok = (cond: boolean, name: string, detail = "") => {
  console.log(`${cond ? "✔" : "✘"} ${name}${!cond && detail ? ` — ${detail}` : ""}`);
  if (!cond) failed++;
};
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

type Joints = Partial<Record<number, Pt>>;
// Builds a 33-point array: every point centred and visible, then the named joints overridden.
function pose(j: Joints): Landmarks {
  const lm: Landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.2, visibility: 0.99 }));
  for (const [i, p] of Object.entries(j)) lm[Number(i)] = { visibility: 0.99, ...p! };
  return lm;
}
// Standing (hipY 0.5) or squatting (hipY closer to the knee: the thigh foreshortens toward the camera).
// kneeIn: how far the RIGHT (operated) knee moves toward the midline. shift: shoulders move in +x.
function body({ hipY = 0.5, kneeIn = 0, kneeOut = 0, shift = 0 } = {}): Landmarks {
  const shY = hipY - 0.25;
  return pose({
    [R_SHOULDER]: { x: 0.38 + shift, y: shY }, [L_SHOULDER]: { x: 0.62 + shift, y: shY },
    [R_HIP]: { x: 0.42, y: hipY }, [L_HIP]: { x: 0.58, y: hipY },
    [R_KNEE]: { x: 0.42 + kneeIn - kneeOut, y: 0.7 }, [L_KNEE]: { x: 0.58 + kneeOut, y: 0.7 },
    [R_ANKLE]: { x: 0.42, y: 0.9 }, [L_ANKLE]: { x: 0.58, y: 0.9 },
  });
}
const mirror = (lm: Landmarks): Landmarks => lm.map((p) => ({ ...p, x: 1 - p.x }));
const STAND = { hipY: 0.5 };
const DOWN = { hipY: 0.55 };
const BOTTOM = { hipY: 0.62 };

console.log("# angles");
ok(near(angleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }), 90), "right angle = 90");
ok(near(angleDeg({ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }), 180), "straight line = 180");
ok(near(kneeFlexion(body(), "right"), 0, 0.5), "straight leg flexion = 0", String(kneeFlexion(body(), "right")));

console.log("\n# framing");
ok(framing(body()).ok, "centred full body is ok", framing(body()).cue);
const lowVis = body(); lowVis[L_ANKLE] = { ...lowVis[L_ANKLE], visibility: 0.2 };
ok(!framing(lowVis).ok && /Step back/.test(framing(lowVis).cue), "ankle with low visibility → step back", framing(lowVis).cue);
const outside = body(); outside[R_ANKLE] = { ...outside[R_ANKLE], y: 1.05 };
ok(!framing(outside).ok && /Step back/.test(framing(outside).cue), "ankle outside the frame → step back");
const tiny = body().map((p) => ({ ...p, x: 0.5 + (p.x - 0.5) * 0.4, y: 0.5 + (p.y - 0.5) * 0.4 }));
ok(!framing(tiny).ok && /closer/.test(framing(tiny).cue), "small figure → come closer", framing(tiny).cue);
const side = body(); side[L_SHOULDER] = { ...side[L_SHOULDER], x: 0.51 }; side[R_SHOULDER] = { ...side[R_SHOULDER], x: 0.49 };
ok(!framing(side).ok && /straight on/.test(framing(side).cue), "narrow shoulders → face the camera", framing(side).cue);

console.log("\n# valgus");
const v0 = valgusRatio(body(BOTTOM), "right");
ok(near(v0, 0), "knee on the hip–ankle line ≈ 0", String(v0));
const vIn = valgusRatio(body({ ...BOTTOM, kneeIn: 0.05 }), "right");
ok(vIn > 0.22, "operated knee toward midline > 0.22", String(vIn));
const vInM = valgusRatio(mirror(body({ ...BOTTOM, kneeIn: 0.05 })), "right");
ok(vInM > 0.22 && near(vIn, vInM), "same result when mirrored", String(vInM));
ok(valgusRatio(body({ ...BOTTOM, kneeOut: 0.03 }), "right") < 0, "knee pushed out is negative");

console.log("\n# weight shift");
// Operated = right (image left, small x); the other leg is at larger x, so +x shift = away from the operated leg.
const s = weightShift(body({ shift: 0.04 }), "right");
ok(s >= 0.15, "shoulders toward non-operated side → positive", String(s));
const sM = weightShift(mirror(body({ shift: 0.04 })), "right");
ok(sM >= 0.15 && near(s, sM), "same when mirrored", String(sM));
ok(weightShift(body({ shift: -0.04 }), "right") < 0, "toward operated side → negative");
ok(near(weightShift(body(), "right"), 0), "centred → 0");

console.log("\n# assess");
const aFrame = assess(lowVis, "right");
ok(aFrame.level === "setup" && /Step back/.test(aFrame.cue), "bad framing → setup cue", JSON.stringify(aFrame));
const aStand = assess(body(STAND), "right");
ok(aStand.phase === "standing" && aStand.level === "good" && aStand.cue === "Ready. Squat down slowly", "standing → Ready", JSON.stringify(aStand));
const aDown = assess(body(DOWN), "right");
ok(aDown.phase === "down" && aDown.cue === "Nice and slow, knees over toes", "going down cue", JSON.stringify(aDown));
const aBottom = assess(body(BOTTOM), "right");
ok(aBottom.phase === "bottom" && aBottom.level === "good" && aBottom.cue === "Good. Hold, then stand up slowly", "bottom clean → Good. Hold", JSON.stringify(aBottom));
const aValgus = assess(body({ ...BOTTOM, kneeIn: 0.05 }), "right");
ok(aValgus.level === "bad" && aValgus.cue === "Push your right knee out over your toes", "bottom with valgus → push knee out (bad)", JSON.stringify(aValgus));
const aValgusM = assess(mirror(body({ ...BOTTOM, kneeIn: 0.05 })), "right");
ok(aValgusM.level === "bad", "valgus also caught when mirrored");
const aStandIn = assess(body({ ...STAND, kneeIn: 0.02 }), "right"); // valgus ≈ 0.125 but still standing
ok(aStandIn.phase === "standing" && aStandIn.valgus >= 0.12 && aStandIn.level === "good", "valgus not judged while standing", JSON.stringify(aStandIn));
const aShift = assess(body({ ...DOWN, shift: 0.04 }), "right");
ok(aShift.level === "warn" && aShift.cue === "Keep your weight even on both feet", "shift → even weight cue", JSON.stringify(aShift));

console.log("\n# RepCounter");
const rc = new RepCounter();
const rep = (bottom: Landmarks) => [body(STAND), body(DOWN), bottom, body(DOWN), body(STAND)];
for (const lm of [...rep(body(BOTTOM)), ...rep(body({ ...BOTTOM, kneeIn: 0.05 }))]) rc.update(assess(lm, "right"));
ok(rc.reps === 2, "counts 2 reps", String(rc.reps));
ok(rc.cleanReps === 1, "1 clean rep", String(rc.cleanReps));
ok(rc.lastRepClean === false, "rep with valgus is not clean");
const rc2 = new RepCounter();
for (const lm of [body(STAND), body(DOWN), body(STAND)]) rc2.update(assess(lm, "right"));
ok(rc2.reps === 0, "half squat without reaching bottom is not a rep");

console.log("\n# smooth");
const a = body(); const b = body({ shift: 0.1 });
const sm = smooth(a, b);
ok(near(sm[R_SHOULDER].x, 0.38 + 0.04), "EMA alpha 0.4 moves 40% of the way", String(sm[R_SHOULDER].x));
ok(smooth(null, b) === b, "no previous → next");

console.log(failed ? `\n${failed} pose test(s) failed` : "\nall pose tests passed");
process.exit(failed ? 1 : 0);
