"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { isDemo, saveNotes } from "@/lib/flow";
import type { Instruction, PhysioNotes } from "@/lib/notes";

type Phase = "input" | "reading" | "done" | "error";

const MAX_PDF_BYTES = 2_000_000;
const CHIP: Record<Instruction["action"], { cls: string; label: string }> = {
  add: { cls: "chip-good", label: "Add" },
  remove: { cls: "chip-bad", label: "Stop" },
  change: { cls: "chip-warn", label: "Change" },
  caution: { cls: "chip-ink", label: "Note" },
};

function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("Couldn't read that file. Please try another PDF."));
    r.readAsDataURL(file);
  });
}

export default function NotesPage() {
  const demo = useSyncExternalStore(() => () => {}, isDemo, () => false);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [result, setResult] = useState<PhysioNotes | null>(null);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const q = demo ? "?demo=1" : "";

  async function read(payload: object) {
    setResult(null);
    setError("");
    setApplied(false);
    setPhase("reading");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // A platform timeout returns HTML, not JSON: show a friendly message, never a parse error.
      const json = await res.json().catch(() => ({ error: "Reading the note took too long. Please try again." }));
      if (!res.ok || json.error) throw new Error(json.error ?? "Something went wrong");
      setResult(json);
      setPhase("done");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setPhase("error");
    }
  }

  async function sendPdf(file: Blob) {
    if (file.size > MAX_PDF_BYTES) {
      setError("That PDF is over 2 MB. Please paste the text of the note instead.");
      setPhase("error");
      return;
    }
    try {
      await read({ pdf: await toBase64(file) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that file.");
      setPhase("error");
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (f) sendPdf(f);
  }

  async function trySample() {
    if (demo) return read({ sample: "sample" });
    try {
      const r = await fetch("/samples/physio-note.pdf");
      await sendPdf(await r.blob());
    } catch {
      setError("Couldn't load the sample. Please try again.");
      setPhase("error");
    }
  }

  const busy = phase === "reading";

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <Link href={`/${q}`} className="backlink">← Home</Link>
      <p className="eyebrow mt-2 text-mute">FROM YOUR PHYSIO</p>
      <h1 className="h-display mt-1 text-3xl">Physio&apos;s advice</h1>
      <p className="mt-3 text-base">
        Paste what your physio sent you, or upload their notes as a PDF. We turn it into changes to your plan.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Paste your physio's message here…"
        className="field mt-4"
        disabled={busy}
      />

      {!busy && (
        <div className="mt-3 space-y-2">
          <button onClick={() => read({ text: text.trim() })} disabled={text.trim().length < 10} className="btn btn-primary w-full">
            Read my physio&apos;s note
          </button>
          <label className="btn btn-secondary w-full">
            ⬆️ Upload PDF
            <input type="file" accept="application/pdf" className="hidden" onChange={onFile} />
          </label>
          <p className="eyebrow pt-2 text-mute">Or try a sample</p>
          <button onClick={trySample} className="btn btn-quiet w-full">Sample physio note (PDF)</button>
          <a href="/samples/physio-note.pdf" target="_blank" rel="noreferrer" className="link block py-2 text-center text-sm">
            View the sample PDF
          </a>
        </div>
      )}

      {busy && (
        <div className="card-dark mt-6 text-center text-sm text-white">
          <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-volt border-t-transparent" />
          Reading your physio&apos;s note…
        </div>
      )}

      {phase === "error" && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      <div ref={resultRef} />
      {phase === "done" && result && !result.usable && (
        <div className="mt-4 rounded-3xl bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">That doesn&apos;t look like physio advice</p>
          <p className="mt-1">{result.unusable_reason || "We couldn't find rehab instructions in that."}</p>
        </div>
      )}

      {phase === "done" && result?.usable && (
        <section className="card mt-5">
          <ul className="divide-y divide-paper">
            {result.instructions.map((i, n) => (
              <li key={n} className="py-3">
                <span className={`chip ${CHIP[i.action].cls}`}>{CHIP[i.action].label}</span>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {i.exercise}
                  {i.dose ? `, ${i.dose}` : ""}
                </p>
                <p className="mt-1 text-sm italic text-mute">&ldquo;{i.quote}&rdquo;</p>
              </li>
            ))}
          </ul>
          {result.from && <p className="mt-2 text-sm text-mute">From: {result.from}</p>}
          {applied ? (
            <div className="card-volt mt-4 text-sm font-semibold">
              Added to your plan.
              <Link href={`/checkin${q}`} className="btn btn-primary mt-3">
                Next: daily check-in → today&apos;s plan
              </Link>
            </div>
          ) : (
            <button
              onClick={() => {
                saveNotes(result);
                setApplied(true);
              }}
              className="btn btn-primary mt-4 w-full"
            >
              Apply to today&apos;s plan
            </button>
          )}
        </section>
      )}

      <p className="note mt-4 text-center">
        The app copies your physio&apos;s instructions. It does not add advice of its own.
      </p>
    </main>
  );
}
