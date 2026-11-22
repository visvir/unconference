"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision"; // type-only: erased at build, keeps prerender safe
import { isDemo } from "@/lib/flow";
import { patient } from "@/lib/patient";
import {
  assess, smooth, RepCounter, type Landmarks, type Level,
  L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE,
} from "@/lib/pose";

// Must match the installed @mediapipe/tasks-vision version (node_modules/@mediapipe/tasks-vision/package.json).
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

type Status = "idle" | "loading" | "running" | "error";
type Ui = { cue: string; level: Level; reps: number; clean: number; flexion: number | null };

const START_UI: Ui = { cue: "Stand 2–3 m back, whole body in view", level: "setup", reps: 0, clean: 0, flexion: null };
const MSG = {
  blocked: "Camera access was blocked. Allow the camera for this site, or use the recorded check instead.",
  unsupported: "This browser can't run the live coach (no camera access). Use the recorded check instead.",
  nocamera: "We couldn't find or start a camera. Use the recorded check instead.",
  model: "The pose model couldn't load (check your connection). Use the recorded check instead.",
};
const LEVEL_COLOUR: Record<Level, string> = { good: "#c8f53c", warn: "#f59e0b", bad: "#ff5a36", setup: "#ffffff" };
const BANNER: Record<Level, string> = {
  setup: "card-dark",
  good: "card-volt",
  warn: "rounded-3xl bg-amber-400 p-5 text-ink",
  bad: "rounded-3xl bg-coral p-5 text-white",
};
const BONES: [number, number][] = [
  [L_SHOULDER, R_SHOULDER], [L_HIP, R_HIP], [L_SHOULDER, L_HIP], [R_SHOULDER, R_HIP],
  [L_HIP, L_KNEE], [L_KNEE, L_ANKLE], [R_HIP, R_KNEE], [R_KNEE, R_ANKLE],
];

export default function LivePage() {
  const leg = patient.profile.surgicalLeg;
  const demo = useSyncExternalStore(() => () => {}, isDemo, () => false);
  const q = demo ? "?demo=1" : "";

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [ui, setUi] = useState<Ui>(START_UI);
  const [speak, setSpeak] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Mutable loop state lives in refs: the camera loop never sets React state per frame.
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef(0);
  const sessionRef = useRef(0); // bumps on stop/unmount so an in-flight start can bail out
  const loop = useRef({
    lastVideoTime: -1, lastSeen: 0, lastUi: 0, lastSpoken: 0, spokenCue: "",
    smoothed: null as Landmarks | null, counter: new RepCounter(), ui: START_UI, speak: false,
  });

  function teardown() {
    sessionRef.current++;
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    try { landmarkerRef.current?.close(); } catch { /* already closed */ }
    landmarkerRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  // Stop the camera and model when leaving the page.
  useEffect(() => teardown, []);

  function fail(msg: string) {
    teardown();
    setError(msg);
    setStatus("error");
  }

  function stop() {
    teardown();
    setStatus("idle");
  }

  function toggleSpeak() {
    const next = !speak;
    setSpeak(next);
    loop.current.speak = next;
    if (!next && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function draw(lm: Landmarks | null, level: Level) {
    const c = canvasRef.current, v = videoRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !v || !ctx) return;
    if (v.videoWidth && (c.width !== v.videoWidth || c.height !== v.videoHeight)) {
      c.width = v.videoWidth;
      c.height = v.videoHeight;
    }
    ctx.clearRect(0, 0, c.width, c.height);
    if (!lm) return;
    const W = c.width, H = c.height;
    ctx.lineWidth = Math.max(3, W / 160);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    for (const [a, b] of BONES) {
      ctx.beginPath();
      ctx.moveTo(lm[a].x * W, lm[a].y * H);
      ctx.lineTo(lm[b].x * W, lm[b].y * H);
      ctx.stroke();
    }
    const opKnee = leg === "left" ? L_KNEE : R_KNEE;
    for (const i of [L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, L_KNEE, R_KNEE, L_ANKLE, R_ANKLE]) {
      const big = i === opKnee;
      ctx.beginPath();
      ctx.arc(lm[i].x * W, lm[i].y * H, big ? W / 40 : W / 110, 0, Math.PI * 2);
      ctx.fillStyle = big ? LEVEL_COLOUR[level] : "#ffffff";
      ctx.fill();
    }
  }

  function publish(next: Ui, now: number) {
    const L = loop.current;
    const prev = L.ui;
    if (prev.cue !== next.cue || prev.level !== next.level || prev.reps !== next.reps ||
        prev.clean !== next.clean || prev.flexion !== next.flexion) {
      L.ui = next;
      setUi(next);
    }
    // Spoken cues: only on change, at most once every 3 s.
    if (L.speak && next.cue !== L.spokenCue && now - L.lastSpoken > 3000 && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(next.cue));
        L.spokenCue = next.cue;
        L.lastSpoken = now;
      } catch { /* speech is optional */ }
    }
  }

  // `now` is the rAF timestamp (same clock as performance.now), monotonic as detectForVideo requires.
  function tick(now: number) {
    rafRef.current = requestAnimationFrame(tick);
    const v = videoRef.current, lmk = landmarkerRef.current, L = loop.current;
    if (!v || !lmk || v.readyState < 2 || v.currentTime === L.lastVideoTime) return;
    L.lastVideoTime = v.currentTime;
    let raw: Landmarks | undefined;
    try {
      raw = lmk.detectForVideo(v, now).landmarks?.[0];
    } catch {
      return; // a dropped frame is fine
    }
    let next: Ui = L.ui;
    if (raw && raw.length >= 33) {
      L.lastSeen = now;
      L.smoothed = smooth(L.smoothed, raw);
      const a = assess(L.smoothed, leg);
      L.counter.update(a);
      draw(L.smoothed, a.level);
      next = {
        cue: a.cue, level: a.level, reps: L.counter.reps, clean: L.counter.cleanReps,
        flexion: a.level === "setup" ? null : Math.round(a.flexion),
      };
    } else {
      L.smoothed = null;
      draw(null, "setup");
      if (now - L.lastSeen > 3000) next = { ...L.ui, cue: "Step into the frame", level: "setup", flexion: null };
    }
    if (now - L.lastUi >= 200) {
      L.lastUi = now;
      publish(next, now);
    }
  }

  async function start() {
    teardown();
    const session = sessionRef.current;
    const live = () => sessionRef.current === session;
    setError("");
    setUi(START_UI);
    loop.current = { ...loop.current, lastVideoTime: -1, lastSeen: performance.now(), lastUi: 0, spokenCue: "",
      smoothed: null, counter: new RepCounter(), ui: START_UI };
    setStatus("loading");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return fail(MSG.unsupported);

    // 1. Camera first, so a permission problem shows its own clear message.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      return fail(name === "NotAllowedError" || name === "SecurityError" ? MSG.blocked : MSG.nocamera);
    }
    if (!live()) return stream.getTracks().forEach((t) => t.stop());
    streamRef.current = stream;

    // 2. Pose model, loaded only now (never at module top level, so the page prerenders).
    let landmarker: PoseLandmarker;
    try {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      const make = (delegate: "GPU" | "CPU") =>
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      try {
        landmarker = await make("GPU");
      } catch {
        landmarker = await make("CPU");
      }
    } catch {
      return live() ? fail(MSG.model) : undefined;
    }
    if (!live()) return landmarker.close();
    landmarkerRef.current = landmarker;

    // 3. Play the camera and start the loop.
    const v = videoRef.current;
    if (!v) return fail(MSG.nocamera);
    v.srcObject = stream;
    try {
      await v.play();
    } catch {
      /* autoplay with muted + playsInline normally works; the loop waits for frames anyway */
    }
    if (!live()) return;
    setStatus("running");
    rafRef.current = requestAnimationFrame(tick);
  }

  const active = status === "loading" || status === "running";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <Link href={`/check${q}`} className="backlink">← Check my progress</Link>
      <p className="eyebrow mt-2 text-mute">LIVE COACH · BETA</p>
      <h1 className="h-display mt-1 text-3xl">Live squat coach</h1>
      <p className="mt-3 text-base">
        Prop your phone or laptop up, stand 2–3 m back facing the camera, and squat slowly. You get a cue on every
        rep. Nothing is recorded or uploaded.
      </p>
      <p className="mt-2 text-sm text-mute">We watch your <b>{leg}</b> (operated) knee.</p>

      {!active && (
        <button onClick={start} className="btn btn-primary mt-4 w-full">▶ Start camera</button>
      )}

      {status === "error" && (
        <div className="mt-4 rounded-3xl bg-amber-50 p-5 text-sm text-amber-900">
          <p>{error}</p>
          <Link href={`/audit${q}`} className="link mt-3 block py-2">Use the recorded form check →</Link>
        </div>
      )}

      <div className={`relative mt-4 overflow-hidden rounded-3xl bg-black ${active ? "" : "hidden"}`}>
        <video ref={videoRef} playsInline muted className="block w-full scale-x-[-1]" />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]" />
        {status === "loading" && (
          <div className="absolute inset-0 flex min-h-48 flex-col items-center justify-center text-sm text-white">
            <div className="mb-3 h-6 w-6 animate-spin rounded-full border-2 border-volt border-t-transparent" />
            Loading the pose model…
          </div>
        )}
      </div>

      {status === "running" && (
        <section className="mt-4 space-y-3">
          <div className={BANNER[ui.level]} aria-live="polite">
            <p className="h-display text-2xl">{ui.cue}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="card !p-3 text-center">
              <p className="stat-num text-3xl">{ui.reps}</p>
              <p className="note mt-1">Reps</p>
            </div>
            <div className="card !p-3 text-center">
              <p className="stat-num text-3xl">{ui.clean}</p>
              <p className="note mt-1">Clean reps</p>
            </div>
            <div className="card !p-3 text-center">
              <p className="stat-num text-3xl">{ui.flexion == null ? "–" : `${ui.flexion}°`}</p>
              <p className="note mt-1">Knee bend now (approx.)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={toggleSpeak} className="btn btn-quiet" aria-pressed={speak}>
              🔊 Speak cues: {speak ? "on" : "off"}
            </button>
            <button onClick={stop} className="btn btn-secondary">■ Stop</button>
          </div>
        </section>
      )}

      <p className="note mt-6 text-center">
        Live cues come from pose tracking in your browser (MediaPipe), using fixed thresholds. They are prompts, not
        measurements or a diagnosis.
      </p>
      <p className="note mt-2 text-center">
        Prefer a detailed review? <Link href={`/audit${q}`} className="link">Recorded form check</Link>
      </p>
    </main>
  );
}
