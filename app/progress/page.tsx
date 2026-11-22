import DemoLink from "@/components/DemoLink";
import RomChart from "@/components/RomChart";
import ShareProgress from "@/components/ShareProgress";
import { patient } from "@/lib/patient";
import { currentPhase } from "@/lib/summary";

export const metadata = { title: "My recovery" };

const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

export default function ProgressPage() {
  const { profile, sessions, phases = [] } = patient;
  const current = currentPhase(patient);
  const curIdx = current ? phases.indexOf(current) : -1;
  const past = [...sessions].reverse();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <DemoLink href="/" className="text-sm font-medium text-teal-700">
        ← Home
      </DemoLink>
      <header className="mb-5 mt-3">
        <p className="text-xs font-medium uppercase tracking-wider text-teal-700">ACL co-pilot</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">My recovery</h1>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-800">Where I am</h2>
        <ol className="mt-3 space-y-2">
          {phases.map((ph, i) => {
            const isCur = i === curIdx;
            const isPast = curIdx >= 0 && i < curIdx;
            return (
              <li
                key={ph.id}
                className={`rounded-xl border p-3 ${isCur ? "border-2 border-teal-700 bg-teal-50" : "border-stone-200 text-stone-500"} ${isPast ? "opacity-70" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${isCur ? "text-stone-900" : "text-stone-600"}`}>
                    {isPast && <span className="mr-1 text-teal-700">✓</span>}
                    {ph.label}
                  </span>
                  <span className="text-xs">{ph.weeks}</span>
                </div>
                {isCur && (
                  <span className="mt-1 inline-block rounded-full bg-teal-700 px-2 py-0.5 text-xs font-medium text-white">
                    You are here · week {profile.weeksPostOp}
                  </span>
                )}
                {!isPast && (
                  <ul className={`mt-2 list-disc pl-5 text-sm ${isCur ? "text-stone-800" : "text-stone-500"}`}>
                    {ph.goals.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-xs text-stone-500">Typical phases. Your surgeon&apos;s protocol comes first.</p>
      </section>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-800">Knee bend over time</h2>
        <RomChart sessions={sessions} />
      </section>

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-800">Past sessions</h2>
        <ul className="mt-2 divide-y divide-stone-100">
          {past.map((s) => (
            <li key={s.date} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-stone-800">{fmt(s.date)}</span>
                <span className="flex items-center gap-2 text-xs text-stone-500">
                  {s.loadIncreased && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">load ↑</span>}
                  {s.exercises.length} exercises
                </span>
              </div>
              <p className="text-stone-600">
                {s.flexionDeg}° bend · pain {s.pain}/10 · swelling {s.swelling}
              </p>
              {s.note && <p className="mt-0.5 text-xs text-stone-500">{s.note}</p>}
            </li>
          ))}
        </ul>
      </section>

      <ShareProgress patient={patient} />
    </main>
  );
}
