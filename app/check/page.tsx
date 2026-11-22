import DemoLink from "@/components/DemoLink";
import { patient } from "@/lib/patient";

// Hub for everything that measures progress. New tests (hop, jump) slot in here as rehab advances.
export default function CheckProgress() {
  const last = patient.sessions[patient.sessions.length - 1];
  const card = "card block";
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <DemoLink href="/" className="backlink">← Home</DemoLink>
      <h1 className="h-display mt-2 text-3xl">Check my progress</h1>
      <p className="mt-2 text-sm text-mute">
        Week {patient.profile.weeksPostOp}: what to measure now. More tests unlock as you move through rehab.
      </p>

      <div className="mt-4 space-y-3">
        <DemoLink href="/audit" className={card}>
          <p className="text-base font-bold text-ink">📹 Squat form</p>
          <p className="mt-1 text-sm text-mute">Film one two-leg squat. Checks knee caving in, weight shift and hip tilt.</p>
          <p className="mt-3"><span className="chip chip-volt">Start →</span></p>
        </DemoLink>

        <DemoLink href="/rom" className={card}>
          <p className="text-base font-bold text-ink">📐 Knee bend (range of motion)</p>
          <p className="mt-1 text-sm text-mute">One side-on photo gives an estimate of how far the knee bends. Last recorded: {last.flexionDeg}°.</p>
          <p className="mt-3"><span className="chip chip-volt">Start →</span></p>
        </DemoLink>

        {[
          { name: "🦵 Single-leg squat", when: "from about week 12" },
          { name: "🏃 Single-leg hop", when: "months 3–6" },
          { name: "⬆️ Jump and landing", when: "months 3–6" },
        ].map((t) => (
          <div key={t.name} className="card-ghost">
            <p className="text-base font-semibold text-mute">{t.name}</p>
            <p className="mt-1 text-sm text-mute">Coming next · {t.when}</p>
          </div>
        ))}
      </div>

      <p className="note mt-4 text-center">
        Observations to discuss with your physio or surgeon, not a diagnosis.
      </p>
    </main>
  );
}
