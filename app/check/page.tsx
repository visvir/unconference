import DemoLink from "@/components/DemoLink";
import { patient } from "@/lib/patient";

// Hub for everything that measures progress. New tests (hop, jump) slot in here as rehab advances.
export default function CheckProgress() {
  const last = patient.sessions[patient.sessions.length - 1];
  const card = "block rounded-2xl border border-stone-200 bg-white p-4 shadow-sm active:bg-stone-50";
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <DemoLink href="/" className="inline-block py-2 text-sm text-teal-700">← Home</DemoLink>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Check my progress</h1>
      <p className="mt-1 text-sm text-stone-600">
        Week {patient.profile.weeksPostOp}: what to measure now. More tests unlock as you move through rehab.
      </p>

      <div className="mt-4 space-y-3">
        <DemoLink href="/audit" className={card}>
          <p className="text-base font-semibold text-stone-900">📹 Squat form</p>
          <p className="mt-1 text-sm text-stone-600">Film one two-leg squat. Checks knee caving in, weight shift and hip tilt.</p>
          <p className="mt-2 text-sm font-semibold text-teal-700">Start →</p>
        </DemoLink>

        <DemoLink href="/rom" className={card}>
          <p className="text-base font-semibold text-stone-900">📐 Knee bend (range of motion)</p>
          <p className="mt-1 text-sm text-stone-600">One side-on photo gives an estimate of how far the knee bends. Last recorded: {last.flexionDeg}°.</p>
          <p className="mt-2 text-sm font-semibold text-teal-700">Start →</p>
        </DemoLink>

        {[
          { name: "🦵 Single-leg squat", when: "from about week 12" },
          { name: "🏃 Single-leg hop", when: "months 3–6" },
          { name: "⬆️ Jump and landing", when: "months 3–6" },
        ].map((t) => (
          <div key={t.name} className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-4">
            <p className="text-base font-semibold text-stone-500">{t.name}</p>
            <p className="mt-1 text-sm text-stone-500">Coming next · {t.when}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-stone-500">
        Observations to discuss with your physio or surgeon, not a diagnosis.
      </p>
    </main>
  );
}
