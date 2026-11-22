// Live squat coach: all the judgement logic, pure (no DOM, no MediaPipe import), unit-tested in scripts/test-pose.ts.
// Input is MediaPipe Pose's 33 landmarks in normalised image coordinates (x right, y down).
// Left/right are the PERSON's sides. Directions ("inward", "toward the other leg") are derived from the
// landmarks themselves, so everything works whether the image is mirrored or not.

export type Pt = { x: number; y: number; visibility?: number };
export type Landmarks = Pt[];
export type Side = "left" | "right";
export type Phase = "standing" | "down" | "bottom";
export type Level = "good" | "warn" | "bad" | "setup";

export const L_SHOULDER = 11, R_SHOULDER = 12, L_HIP = 23, R_HIP = 24;
export const L_KNEE = 25, R_KNEE = 26, L_ANKLE = 27, R_ANKLE = 28;

// Fixed thresholds (prompts, not measurements).
export const BOTTOM_FLEXION = 60;
export const DOWN_FLEXION = 25;
export const VALGUS_WARN = 0.12;
export const VALGUS_BAD = 0.22;
export const SHIFT_WARN = 0.15;
export const MIN_VISIBILITY = 0.5;
export const FRAME_MARGIN = 0.02;
export const MIN_BODY_HEIGHT = 0.35;

const J = {
  left: { hip: L_HIP, knee: L_KNEE, ankle: L_ANKLE },
  right: { hip: R_HIP, knee: R_KNEE, ankle: R_ANKLE },
};
const other = (s: Side): Side => (s === "left" ? "right" : "left");
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const hipWidth = (lm: Landmarks) => Math.max(Math.abs(lm[L_HIP].x - lm[R_HIP].x), 0.02);

/** Interior angle at b, in degrees (0–180). */
export function angleDeg(a: Pt, b: Pt, c: Pt): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };
  const n = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  if (n === 0) return 180;
  const cos = Math.min(1, Math.max(-1, (v1.x * v2.x + v1.y * v2.y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** 180 − angle(hip, knee, ankle) in the 2D image (0 = straight). Front-view projection: under-reads depth. */
export function kneeFlexion(lm: Landmarks, side: Side): number {
  const j = J[side];
  return 180 - angleDeg(lm[j.hip], lm[j.knee], lm[j.ankle]);
}

/**
 * Rough bend estimate for phase detection from the front. Facing the camera, the thigh mostly tilts TOWARD
 * the lens as you squat, so its 2D angle barely changes but its on-screen length shrinks relative to the shin.
 * We take the larger of the 2D angle and acos(thigh / shin). Approximate; used only for standing/down/bottom.
 */
export function bendEstimate(lm: Landmarks, side: Side): number {
  const j = J[side];
  const shin = dist(lm[j.knee], lm[j.ankle]);
  const thigh = dist(lm[j.hip], lm[j.knee]);
  const fore = shin > 0 ? (Math.acos(Math.min(1, thigh / shin)) * 180) / Math.PI : 0;
  return Math.max(kneeFlexion(lm, side), fore);
}

/** Can we see the whole body, big enough, from the front? */
export function framing(lm: Landmarks): { ok: boolean; cue: string } {
  if (!lm || lm.length < 33) return { ok: false, cue: "Step into the frame" };
  const key = [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE].map((i) => lm[i]);
  const lo = FRAME_MARGIN, hi = 1 - FRAME_MARGIN;
  if (key.some((p) => !p || (p.visibility ?? 1) < MIN_VISIBILITY || p.x < lo || p.x > hi || p.y < lo || p.y > hi)) {
    return { ok: false, cue: "Step back so I can see your whole body" };
  }
  const top = Math.min(lm[L_SHOULDER].y, lm[R_SHOULDER].y);
  const bottom = Math.max(lm[L_ANKLE].y, lm[R_ANKLE].y);
  if (bottom - top < MIN_BODY_HEIGHT) return { ok: false, cue: "Come a little closer" };
  // Side-view proxy (conservative): shoulders almost on top of each other compared with torso length.
  const shoulderW = Math.abs(lm[L_SHOULDER].x - lm[R_SHOULDER].x);
  const torso = Math.abs(lm[L_HIP].y - lm[L_SHOULDER].y);
  if (shoulderW < 0.5 * torso * 0.5) return { ok: false, cue: "Face the camera straight on" };
  return { ok: true, cue: "" };
}

/**
 * Knee caving in: the knee's distance toward the midline from the straight hip–ankle line, divided by hip width.
 * Positive = inward (toward the other leg). Direction comes from the mid-hip, so mirroring doesn't matter.
 */
export function valgusRatio(lm: Landmarks, side: Side): number {
  const j = J[side];
  const hip = lm[j.hip], knee = lm[j.knee], ankle = lm[j.ankle];
  const dy = ankle.y - hip.y;
  const t = dy !== 0 ? (knee.y - hip.y) / dy : 0;
  const lineX = hip.x + (ankle.x - hip.x) * t;
  const midX = (lm[L_HIP].x + lm[R_HIP].x) / 2;
  const inward = Math.sign(midX - hip.x) || 1;
  return ((knee.x - lineX) * inward) / hipWidth(lm);
}

/** Shoulders over feet, in hip widths. Positive = shifted AWAY from the operated leg (unloading it). */
export function weightShift(lm: Landmarks, operated: Side): number {
  const sh = mid(lm[L_SHOULDER], lm[R_SHOULDER]);
  const an = mid(lm[L_ANKLE], lm[R_ANKLE]);
  const towardOther = Math.sign(lm[J[other(operated)].hip].x - lm[J[operated].hip].x) || 1;
  return ((sh.x - an.x) * towardOther) / hipWidth(lm);
}

export type Assessment = {
  framing: { ok: boolean; cue: string };
  flexion: number;
  phase: Phase;
  valgus: number;
  shift: number;
  cue: string;
  level: Level;
};

export function assess(lm: Landmarks, operated: Side): Assessment {
  const f = framing(lm);
  if (!f.ok) return { framing: f, flexion: 0, phase: "standing", valgus: 0, shift: 0, cue: f.cue, level: "setup" };
  const flexion = bendEstimate(lm, operated);
  const phase: Phase = flexion >= BOTTOM_FLEXION ? "bottom" : flexion >= DOWN_FLEXION ? "down" : "standing";
  const valgus = valgusRatio(lm, operated);
  const shift = weightShift(lm, operated);
  const base = { framing: f, flexion, phase, valgus, shift };
  if (phase !== "standing" && valgus >= VALGUS_WARN) {
    return { ...base, cue: `Push your ${operated} knee out over your toes`, level: valgus >= VALGUS_BAD ? "bad" : "warn" };
  }
  if (shift >= SHIFT_WARN) return { ...base, cue: "Keep your weight even on both feet", level: "warn" };
  if (phase === "bottom") return { ...base, cue: "Good. Hold, then stand up slowly", level: "good" };
  if (phase === "standing") return { ...base, cue: "Ready. Squat down slowly", level: "good" };
  return { ...base, cue: "Nice and slow, knees over toes", level: "good" };
}

/** Counts standing → bottom → standing as one rep; a rep is clean if no frame in it reached warn. */
export class RepCounter {
  reps = 0;
  cleanReps = 0;
  lastRepClean: boolean | null = null;
  lastRepWorstValgus = 0;
  private inRep = false;
  private reachedBottom = false;
  private clean = true;
  private worst = 0;

  update(a: Assessment): void {
    if (a.level === "setup") return; // ignore frames where we can't see the person
    if (a.phase !== "standing") {
      if (!this.inRep) {
        this.inRep = true;
        this.reachedBottom = false;
        this.clean = true;
        this.worst = 0;
      }
      if (a.phase === "bottom") this.reachedBottom = true;
      this.worst = Math.max(this.worst, a.valgus);
      if (a.level === "warn" || a.level === "bad") this.clean = false;
      return;
    }
    if (this.inRep && this.reachedBottom) {
      this.reps++;
      if (this.clean) this.cleanReps++;
      this.lastRepClean = this.clean;
      this.lastRepWorstValgus = this.worst;
    }
    this.inRep = false;
  }
}

/** Exponential moving average per landmark, to stop cue flicker. */
export function smooth(prev: Landmarks | null, next: Landmarks, alpha = 0.4): Landmarks {
  if (!prev || prev.length !== next.length) return next;
  return next.map((p, i) => ({
    x: prev[i].x + (p.x - prev[i].x) * alpha,
    y: prev[i].y + (p.y - prev[i].y) * alpha,
    visibility: p.visibility,
  }));
}
