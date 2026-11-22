"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { FINDING_LABELS } from "@/lib/audit";
import { extractFrames } from "@/lib/frames";
import { isDemo, SAMPLES, clearAudit, saveAudit } from "@/lib/flow";
import { patient } from "@/lib/patient";
import type { SquatAudit } from "@/lib/types";

type Phase = "pick" | "analysing" | "done" | "error";

const SEV = [
  { label: "Looks good", cls: "chip-good" },
  { label: "Mild", cls: "chip-mild" },
  { label: "Moderate", cls: "chip-warn" },
  { label: "Marked", cls: "chip-bad" },
];

export default function AuditPage() {
  const leg = patient.profile.surgicalLeg;
  const demo = useSyncExternalStore(() => () => {}, isDemo, () => false);
  const [src, setSrc] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [audit, setAudit] = useState<SquatAudit | null>(null);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  async function analyse(videoSrc: string, sampleId?: string) {
    clearAudit(); // a failed re-analysis must not leave the previous check saved
    setSrc(videoSrc);
    setAudit(null);
    setError("");
    setPhase("analysing");
    try {
      // Demo mode with a bundled sample: cached response, no frames, no network to the model.
      const payload =
        demo && sampleId ? { sample: sampleId } : { frames: await extractFrames(videoSrc), leg };
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // A platform timeout returns HTML, not JSON: show a friendly message, never a parse error.
      const json = await res.json().catch(() => ({ error: "The form check took too long. Please try again." }));
      if (!res.ok || json.error) throw new Error(json.error ?? "Something went wrong");
      setAudit(json);
      saveAudit(json);
      setPhase("done");
      // Bring the result into view (on a laptop the video can push it below the fold).
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    // The video never leaves the phone; only 8 small frames are sent. The cap just guards memory.
    if (f.size > 200 * 1024 * 1024) {
      setError("That video is very large. Please trim it to 3–5 seconds.");
      setPhase("error");
      return;
    }
    e.target.value = ""; // allow picking the same file again
    analyse(URL.createObjectURL(f));
  }

  function seek(t: number) {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    v.currentTime = t;
    v.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const findings = audit?.findings ?? [];
  const sorted = [...findings].sort((a, b) => b.severity - a.severity);
  const q = demo ? "?demo=1" : "";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <Link href={`/check${q}`} className="backlink">← Check my progress</Link>
      <p className="eyebrow mt-2 text-mute">FORM CHECK</p>
      <h1 className="h-display mt-1 text-3xl">Squat form check</h1>
      <p className="mt-3 text-base">
        Film one two-leg bodyweight squat <b>from the front</b>, whole body in frame, 3–5 seconds. We watch your <b>{leg}</b> (operated) knee.
      </p>

      {src && (
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          muted
          className="mt-4 max-h-[45vh] w-full rounded-3xl bg-black object-contain"
        />
      )}

      {(phase === "pick" || phase === "error" || phase === "done") && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="btn btn-primary">
              📹 {phase === "done" ? "Record again" : "Record squat"}
              <input type="file" accept="video/*" capture="environment" className="hidden" onChange={onFile} />
            </label>
            <label className="btn btn-secondary">
              ⬆️ Upload video
              <input type="file" accept="video/*" className="hidden" onChange={onFile} />
            </label>
          </div>
          <p className="eyebrow pt-2 text-mute">Or try a sample</p>
          <div className="grid grid-cols-3 gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => analyse(s.src, s.id)}
                className="btn btn-quiet !px-1"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "analysing" && (
        <div className="card-dark mt-6 text-center text-sm text-white">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-volt border-t-transparent" />
          Watching your squat frame by frame…
        </div>
      )}

      {phase === "error" && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div ref={resultRef} />
      {phase === "done" && audit && !audit.video_usable && (
        <div className="mt-4 rounded-3xl bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Let&apos;s re-record</p>
          <p className="mt-1">{audit.unusable_reason || "We couldn't see your whole leg clearly."}</p>
          <Link href={`/checkin${q}`} className="link mt-3 block py-3 text-center text-sm">
            Skip the form check for now →
          </Link>
        </div>
      )}

      {phase === "done" && audit?.video_usable && (
        <section className="mt-5">
          <p className="text-base">{audit.summary}</p>
          <ul className="mt-4 space-y-4">
            {sorted.map((f) => (
              <li key={f.type} className="card">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold">{FINDING_LABELS[f.type]}</h3>
                  <span className={`chip shrink-0 ${SEV[f.severity].cls}`}>
                    {SEV[f.severity].label} · {f.severity}/3
                  </span>
                </div>
                <p className="mt-2 text-sm text-mute">{f.observation}</p>
                {f.severity > 0 && (
                  <>
                    <button
                      onClick={() => seek(f.timestampSec)}
                      className="chip chip-ink mt-3 min-h-10 px-4 active:scale-95"
                    >
                      ▶ See it at {f.timestampSec.toFixed(1)}s
                    </button>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-sm marker:text-volt-deep">
                      {f.cues.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ul>
          <Link
            href={`/checkin${q}`}
            className="btn btn-primary mt-6 w-full"
          >
            Next: how does the knee feel today? →
          </Link>
          <p className="note mt-4 text-center">
            Observations to discuss with your physio or surgeon. Not a diagnosis. AI movement analysis can be wrong.
          </p>
        </section>
      )}
    </main>
  );
}
