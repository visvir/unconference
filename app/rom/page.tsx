"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { isDemo, ROM_SAMPLE, saveRom } from "@/lib/flow";
import { patient } from "@/lib/patient";
import type { RomResult } from "@/lib/rom";

type Phase = "pick" | "analysing" | "done" | "error";

const MAX_SIDE = 768;
const READ_FAIL = "Couldn't read that photo. Please use a JPG or PNG, or take the photo with the button above.";

// Downsize in the browser: phone photos are 3–12 MB, the model needs ~768 px.
async function downsize(src: string): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  if (!img.naturalWidth || !img.naturalHeight) throw new Error(READ_FAIL);
  const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * k);
  c.height = Math.round(img.naturalHeight * k);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const b64 = c.toDataURL("image/jpeg", 0.8).split(",")[1];
  if (!c.width || !c.height || !b64) throw new Error(READ_FAIL);
  return b64;
}

export default function RomPage() {
  const leg = patient.profile.surgicalLeg;
  const demo = useSyncExternalStore(() => () => {}, isDemo, () => false);
  const [src, setSrc] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("pick");
  const [rom, setRom] = useState<RomResult | null>(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const last = patient.sessions[patient.sessions.length - 1]?.flexionDeg;
  const q = demo ? "?demo=1" : "";

  async function estimate(photoSrc: string, sampleId?: string) {
    setSrc(photoSrc);
    setRom(null);
    setError("");
    setAdded(false);
    setPhase("analysing");
    try {
      let image = "";
      if (!(demo && sampleId)) {
        try {
          image = await downsize(photoSrc);
        } catch {
          throw new Error(READ_FAIL);
        }
      }
      const payload = sampleId ? { sample: sampleId } : { image, leg };
      const res = await fetch("/api/rom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // A platform timeout returns HTML, not JSON: show a friendly message, never a parse error.
      const json = await res.json().catch(() => ({ error: "The estimate took too long. Please try again." }));
      if (!res.ok || json.error) throw new Error(json.error ?? "Something went wrong");
      setRom(json);
      setPhase("done");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = ""; // allow picking the same file again
    estimate(URL.createObjectURL(f));
  }

  const busy = phase === "analysing";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <Link href={`/check${q}`} className="backlink">← Check my progress</Link>
      <p className="eyebrow mt-2 text-mute">RANGE OF MOTION</p>
      <h1 className="h-display mt-1 text-3xl">Knee bend from a photo</h1>
      <p className="mt-3 text-base">
        Bend your <b>{leg}</b> knee as far as is comfortable. Take a photo <b>from the side</b>, at knee height, with hip, knee and ankle in frame.
      </p>

      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Your photo" className="mt-4 max-h-[45vh] w-full rounded-3xl bg-black object-contain" />
      )}

      {!busy && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="btn btn-primary">
              📷 Take photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
            </label>
            <label className="btn btn-secondary">
              ⬆️ Upload photo
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
          </div>
          <p className="eyebrow pt-2 text-mute">Or try a sample</p>
          <button
            onClick={() => estimate(ROM_SAMPLE.src, ROM_SAMPLE.id)}
            className="btn btn-quiet w-full"
          >
            {ROM_SAMPLE.label}
          </button>
        </div>
      )}

      {busy && (
        <div className="card-dark mt-6 text-center text-sm text-white">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-volt border-t-transparent" />
          Estimating the angle…
        </div>
      )}

      {phase === "error" && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

      <div ref={resultRef} />
      {phase === "done" && rom && !rom.photo_usable && (
        <div className="mt-4 rounded-3xl bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Let&apos;s retake</p>
          <p className="mt-1">{rom.unusable_reason || "We couldn't see your hip, knee and ankle clearly."}</p>
        </div>
      )}

      {phase === "done" && rom?.photo_usable && (
        <section className="card mt-5">
          <p className="stat-num text-6xl">About {rom.flexionDeg}°</p>
          <p className="mt-3 text-sm text-mute">
            Estimate from one photo, about ±10°. Confidence: {rom.confidence}.
          </p>
          <p className="mt-3 text-sm">{rom.observation}</p>
          {last !== undefined && <p className="mt-2 text-sm text-mute">Last recorded: {last}°</p>}
          {added ? (
            <div className="card-volt mt-4 text-sm font-semibold">
              Added. It shows as Today on your chart.
              <Link href={`/checkin${q}`} className="btn btn-primary mt-3">
                Next: daily check-in → today&apos;s plan
              </Link>
              <Link href={`/${q}`} className="link mt-2 block py-2 text-center">Back to Home</Link>
            </div>
          ) : (
            <button
              onClick={() => {
                saveRom(rom.flexionDeg);
                setAdded(true);
              }}
              className="btn btn-primary mt-4 w-full"
            >
              Add to my chart
            </button>
          )}
        </section>
      )}

      {phase === "done" && (
        <button
          onClick={() => {
            setSrc(null);
            setRom(null);
            setAdded(false);
            setPhase("pick");
          }}
          className="btn btn-secondary mt-3 w-full"
        >
          Retake
        </button>
      )}

      <p className="note mt-4 text-center">An estimate to discuss with your physio, not a measurement.</p>
    </main>
  );
}
