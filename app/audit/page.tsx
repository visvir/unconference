"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { FINDING_LABELS } from "@/lib/audit";
import { extractFrames } from "@/lib/frames";
import { isDemo, SAMPLES, saveAudit } from "@/lib/flow";
import { patient } from "@/lib/patient";
import type { SquatAudit } from "@/lib/types";

type Phase = "pick" | "analysing" | "done" | "error";

const SEV = [
  { label: "Looks good", cls: "bg-emerald-100 text-emerald-800" },
  { label: "Mild", cls: "bg-lime-100 text-lime-800" },
  { label: "Moderate", cls: "bg-amber-100 text-amber-900" },
  { label: "Marked", cls: "bg-red-100 text-red-800" },
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
      <Link href={`/${q}`} className="text-sm text-teal-700">← Home</Link>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Squat form check</h1>
      <p className="mt-1 text-sm text-stone-600">
        Film one single-leg squat on your <b>{leg}</b> leg, <b>from the front</b>, whole body in frame, 3–5 seconds.
      </p>

      {src && (
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          muted
          className="mt-4 max-h-[45vh] w-full rounded-2xl bg-black object-contain"
        />
      )}

      {(phase === "pick" || phase === "error" || phase === "done") && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="block cursor-pointer rounded-2xl bg-teal-700 px-3 py-4 text-center font-semibold text-white active:bg-teal-800">
              📹 {phase === "done" ? "Record again" : "Record squat"}
              <input type="file" accept="video/*" capture="environment" className="hidden" onChange={onFile} />
            </label>
            <label className="block cursor-pointer rounded-2xl border-2 border-teal-700 bg-white px-3 py-4 text-center font-semibold text-teal-800 active:bg-teal-50">
              ⬆️ Upload video
              <input type="file" accept="video/*" className="hidden" onChange={onFile} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SAMPLES.map((s) => (
              <button
                key={s.id}
                onClick={() => analyse(s.src, s.id)}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 active:bg-stone-100"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "analysing" && (
        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 text-center text-sm text-stone-600">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
          Watching your squat frame by frame…
        </div>
      )}

      {phase === "error" && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <div ref={resultRef} />
      {phase === "done" && audit && !audit.video_usable && (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Let&apos;s re-record</p>
          <p className="mt-1">{audit.unusable_reason ?? "We couldn't see your whole leg clearly."}</p>
        </div>
      )}

      {phase === "done" && audit?.video_usable && (
        <section className="mt-5">
          <p className="text-sm text-stone-700">{audit.summary}</p>
          <ul className="mt-3 space-y-3">
            {sorted.map((f) => (
              <li key={f.type} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-stone-900">{FINDING_LABELS[f.type]}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${SEV[f.severity].cls}`}>
                    {SEV[f.severity].label} · {f.severity}/3
                  </span>
                </div>
                {f.severity > 0 && (
                  <>
                    <p className="mt-1 text-sm text-stone-600">{f.observation}</p>
                    <button
                      onClick={() => seek(f.timestampSec)}
                      className="mt-2 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-white active:bg-stone-700"
                    >
                      ▶ See it at {f.timestampSec.toFixed(1)}s
                    </button>
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-stone-800">
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
            className="mt-5 block rounded-2xl bg-teal-700 px-4 py-4 text-center font-semibold text-white active:bg-teal-800"
          >
            Next: how does the knee feel today? →
          </Link>
          <p className="mt-3 text-center text-xs text-stone-500">
            Observations to discuss with your physio or surgeon. Not a diagnosis. AI movement analysis can be wrong.
          </p>
        </section>
      )}
    </main>
  );
}
