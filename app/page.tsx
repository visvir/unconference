import DemoLink from "@/components/DemoLink";
import WeekStrip from "@/components/WeekStrip";
import RomChart from "@/components/RomChart";
import ShareProgress from "@/components/ShareProgress";
import { patient } from "@/lib/patient";

export default function Home() {
  const { profile, sessions, todayPlan, week } = patient;
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const gain = last.flexionDeg - first.flexionDeg;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-4">
      <header className="card-dark">
        <p className="eyebrow text-volt">ACL co-pilot</p>
        <h1 className="h-display mt-2 text-4xl text-white">Hi {profile.name.split(" ")[0]} 👋</h1>
        <p className="mt-2 text-sm text-white/70">
          Week {profile.weeksPostOp} after ACL reconstruction · {profile.graft} graft · {profile.surgicalLeg} knee ·
          meniscus repair: {profile.meniscusRepair ? "yes" : "no"}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="min-w-0 rounded-2xl bg-ink-soft p-3">
            <p className="eyebrow text-white/60">Week</p>
            <p className="stat-num mt-2 text-3xl">{profile.weeksPostOp}</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-ink-soft p-3">
            <p className="eyebrow text-white/60">Knee bend</p>
            <p className="stat-num mt-2 text-3xl">{last.flexionDeg}°</p>
            <p className="mt-1 text-[11px] font-semibold leading-tight text-volt">+{gain}° since {new Date(first.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-ink-soft p-3">
            <p className="eyebrow text-white/60">Pain</p>
            <p className="stat-num mt-2 text-3xl">{last.pain}/10</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/70">{last.extensionDeg === 0 ? "Fully straight" : `Lacking ${last.extensionDeg}° of full straightening`} · pain yesterday {last.pain}/10</p>
      </header>

      <div className="mt-4">{week && <WeekStrip week={week} />}</div>

      <section className="card mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="eyebrow text-mute">Knee bend (flexion)</h2>
          <span className="text-xs text-mute">last 3 weeks</span>
        </div>
        <RomChart sessions={sessions} />
        <DemoLink href="/progress" className="btn btn-quiet mt-3">
          🗺 My recovery journey
        </DemoLink>
      </section>

      {last.note && (
        <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-semibold">Yesterday:</span> {last.note}
        </p>
      )}

      <section className="card mt-4">
        <h2 className="eyebrow text-mute">Today&apos;s planned workout</h2>
        <ul className="mt-2 divide-y divide-black/5">
          {todayPlan.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-semibold text-ink">
                {e.name}
                {e.kind === "loading" && <span className="chip chip-ink ml-2 align-middle">load</span>}
              </span>
              <span className="shrink-0 text-mute">{e.dose}</span>
            </li>
          ))}
        </ul>
      </section>

      <DemoLink href="/check" className="btn btn-primary mt-6">
        📈 Check my progress
      </DemoLink>
      <p className="note mt-2 text-center">Squat form · knee bend</p>
      <DemoLink href="/checkin" className="btn btn-secondary mt-3">
        📝 Daily check-in → today&apos;s plan
      </DemoLink>
      <ShareProgress patient={patient} compact />
      <p className="note mt-3 text-center">
        Observations to discuss with your physio or surgeon, not a diagnosis.
      </p>
    </main>
  );
}
