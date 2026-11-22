"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { isDemo, loadAudit } from "@/lib/flow";
import QuickPlan from "@/components/QuickPlan";
import VoiceInput from "@/components/VoiceInput";
import { patient } from "@/lib/patient";
import { checkRedFlags, decidePlan } from "@/lib/rules";
import type { DailyPlan, RedFlagResult, Swelling } from "@/lib/types";

const EXAMPLE = "Kal squats badhaye the, aaj knee thoda swollen aur stairs pe khichav";
const noop = () => () => {};

export default function CheckInPage() {
  const demo = useSyncExternalStore(noop, isDemo, () => false);
  const audit = useSyncExternalStore(noop, loadAudit, () => null);
  const [text, setText] = useState("");
  const [swelling, setSwelling] = useState<Swelling | null>(null);
  const [redFlag, setRedFlag] = useState<RedFlagResult | null>(null);
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [needSwelling, setNeedSwelling] = useState(false);
  const planRef = useRef<HTMLElement>(null);
  const reqId = useRef(0); // ignore late explanations after the user edits the check-in

  const yesterday = patient.sessions[patient.sessions.length - 1];
  const q = demo ? "?demo=1" : "";
  const maxSev = useMemo(
    () => (audit?.video_usable ? Math.max(0, ...audit.findings.map((f) => f.severity)) : null),
    [audit],
  );

  async function submit() {
    if (!text.trim()) return;
    // 1. Red flags first. Deterministic, they stop the flow, and they don't wait for the swelling answer.
    const rf = checkRedFlags(text);
    if (rf.hit) {
      setRedFlag(rf);
      return;
    }
    if (!swelling) {
      setNeedSwelling(true);
      return;
    }
    // 2. Fixed rule decides the plan.
    const p = decidePlan(yesterday, { text, swelling }, audit, patient.todayPlan);
    setPlan(p);
    setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    // 3. The model only explains it, in the patient's language.
    const id = ++reqId.current;
    setExplaining(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInText: text,
          decision: p.decision,
          reasons: p.reasons,
          kept: p.exercises.map((e) => e.name),
          removed: p.removed.map((e) => e.name),
          demo,
        }),
      });
      const json = res.ok ? await res.json() : {};
      if (id === reqId.current) setPlan({ ...p, explanation: json.explanation || fallbackExplanation(p) });
    } catch {
      if (id === reqId.current) setPlan({ ...p, explanation: fallbackExplanation(p) });
    } finally {
      if (id === reqId.current) setExplaining(false);
    }
  }

  if (redFlag) {
    return (
      <main className="fixed inset-0 z-50 flex flex-col justify-center bg-red-700 px-6 text-white">
        <p className="text-5xl">⚠️</p>
        <h1 className="mt-4 text-3xl font-bold">Contact your surgeon today</h1>
        <p className="mt-4 text-lg">
          Stop exercising today. What you described ({redFlag.matched.join(", ")}) can be a sign of a problem that needs a doctor quickly.
        </p>
        <p className="mt-4 rounded-xl bg-white/15 p-3 text-base">
          If you have chest pain or trouble breathing, go to the nearest emergency department or call <b>108</b> now.
        </p>
        <p className="mt-6 text-sm text-red-100">
          {patient.profile.surgeon.name} · {patient.profile.surgeon.hospital}
        </p>
        <button onClick={() => setRedFlag(null)} className="mt-8 self-start text-sm text-red-100 underline">
          I typed this by mistake, go back
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href={`/${q}`} className="inline-block py-2 text-sm text-teal-700">← Home</Link>
        <Link href={`/audit${q}`} className="inline-block py-2 text-sm text-teal-700">📹 Squat form check</Link>
      </div>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">How&apos;s the knee today?</h1>
      <p className="mt-1 text-sm text-stone-600">Type or say it the way you&apos;d tell your physio, in English or Hinglish.</p>

      {maxSev !== null && (
        <p className="mt-3 rounded-xl bg-stone-100 px-3 py-2 text-xs text-stone-700">
          {["Form check: looked good","Form check: mild issue seen (1/3)","Form check: moderate issue seen (2/3)","Form check: marked issue seen (3/3)"][Math.min(3, Math.max(0, maxSev))]}
        </p>
      )}

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPlan(null); // editing the check-in re-opens the button
          reqId.current++;
        }}
        rows={3}
        placeholder={EXAMPLE}
        className="mt-4 w-full rounded-2xl border border-stone-300 bg-white p-3 text-base text-stone-900 outline-none focus:border-teal-700"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <VoiceInput
          onText={(t) => {
            // The transcript lands in the box so the patient can read and fix it before submitting.
            setText((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t));
            setPlan(null);
            reqId.current++;
          }}
        />
        {!text && (
          <button onClick={() => { setText(EXAMPLE); setPlan(null); }} className="py-2 text-xs text-teal-700 underline">
            Use example
          </button>
        )}
      </div>

      <p className={`mt-4 text-sm font-medium ${needSwelling ? "text-red-700" : "text-stone-800"}`}>
        Swelling compared to yesterday{needSwelling ? " (please pick one)" : ""}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {(["less", "same", "more"] as Swelling[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setSwelling(s);
              setNeedSwelling(false);
              setPlan(null);
            }}
            className={`rounded-xl border px-3 py-3 text-sm font-medium capitalize ${
              swelling === s ? "border-teal-700 bg-teal-700 text-white" : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {!plan && (
        <button
          onClick={submit}
          disabled={!text.trim()}
          className="mt-6 w-full rounded-2xl bg-teal-700 px-4 py-4 font-semibold text-white disabled:opacity-40"
        >
          Get today&apos;s plan
        </button>
      )}

      {plan && (
        <section ref={planRef} className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <p
            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              plan.decision === "deload" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {plan.decision === "deload" ? "Lighter day today" : "Go ahead with your plan"}
          </p>

          <div className="mt-3 min-h-[3rem] text-base leading-relaxed text-stone-900">
            {explaining ? <span className="text-sm text-stone-500">Writing your note…</span> : plan.explanation}
          </div>

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Why (fixed safety rule)</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-stone-700">
            {plan.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Today</h3>
          <ul className="mt-1 divide-y divide-stone-100">
            {plan.exercises.map((e) => (
              <li key={e.id} className="flex justify-between py-2 text-sm">
                <span className="text-stone-900">✓ {e.name}</span>
                <span className="text-stone-500">{e.dose}</span>
              </li>
            ))}
            {plan.removed.map((e) => (
              <li key={e.id} className="flex justify-between py-2 text-sm text-stone-400 line-through">
                <span>{e.name}</span>
                <span>{e.dose}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <QuickPlan key={plan.decision} exercises={plan.exercises} />
          </div>
          <p className="mt-4 text-xs text-stone-500">
            Observations to discuss with your physio or surgeon. Not a diagnosis or a prescription.
          </p>
        </section>
      )}
    </main>
  );
}

// Deterministic fallback if the model is slow or down. The plan itself never depends on the model.
function fallbackExplanation(p: DailyPlan) {
  return p.decision === "deload"
    ? "Today is a lighter day because of the reasons below. Do the exercises listed and mention it to your physio."
    : "Go ahead with today's plan as written. Mention any new pain or swelling to your physio.";
}
