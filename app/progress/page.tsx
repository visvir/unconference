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
      <DemoLink href="/" className="backlink">
        ← Home
      </DemoLink>
      <header className="mb-5 mt-3">
        <p className="eyebrow text-mute">ACL co-pilot</p>
        <h1 className="h-display mt-1 text-3xl">My recovery</h1>
      </header>

      <section className="card">
        <h2 className="eyebrow text-mute">Where I am</h2>
        <ol className="mt-3 space-y-3">
          {phases.map((ph, i) => {
            const isCur = i === curIdx;
            const isPast = curIdx >= 0 && i < curIdx;
            return (
              <li
                key={ph.id}
                className={isCur ? "card-dark" : "flex flex-col px-1 text-mute"}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-bold ${isCur ? "text-white" : "text-mute"}`}>
                    {isPast ? <span className="mr-1 text-ink">✓</span> : !isCur && <span className="mr-2 inline-block h-3 w-3 rounded-full border-2 border-mute align-middle" />}
                    {ph.label}
                  </span>
                  <span className={`text-xs ${isCur ? "text-white/70" : ""}`}>{ph.weeks}</span>
                </div>
                {isCur && (
                  <span className="chip chip-volt mt-2 self-start">
                    You are here · week {profile.weeksPostOp}
                  </span>
                )}
                {!isPast && (
                  <ul className={`mt-2 list-disc pl-5 text-sm ${isCur ? "text-white" : "text-mute"}`}>
                    {ph.goals.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
        <p className="note mt-3">Typical phases. Your surgeon&apos;s protocol comes first.</p>
      </section>

      <section className="card mt-4">
        <h2 className="eyebrow text-mute">Knee bend over time</h2>
        <RomChart sessions={sessions} />
      </section>

      <section className="card mt-4">
        <h2 className="eyebrow text-mute">Past sessions</h2>
        <ul className="mt-2 divide-y divide-paper">
          {past.map((s) => (
            <li key={s.date} className="py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-ink">{fmt(s.date)}</span>
                <span className="flex items-center gap-2 text-xs text-mute">
                  {s.loadIncreased && <span className="chip chip-warn">load ↑</span>}
                  {s.exercises.length} exercises
                </span>
              </div>
              <p className="text-mute">
                {s.flexionDeg}° bend · pain {s.pain}/10 · swelling {s.swelling}
              </p>
              {s.note && <p className="mt-0.5 text-xs text-mute">{s.note}</p>}
            </li>
          ))}
        </ul>
      </section>

      <ShareProgress patient={patient} />
    </main>
  );
}
