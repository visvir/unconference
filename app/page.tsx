import DemoLink from "@/components/DemoLink";
import WeekStrip from "@/components/WeekStrip";
import RomChart from "@/components/RomChart";
import { patient } from "@/lib/patient";

export default function Home() {
  const { profile, sessions, todayPlan, week } = patient;
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const gain = last.flexionDeg - first.flexionDeg;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-teal-700">ACL co-pilot</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Hi {profile.name.split(" ")[0]} 👋</h1>
        <p className="mt-1 text-sm text-stone-600">
          Week {profile.weeksPostOp} after ACL reconstruction · {profile.graft} graft · {profile.surgicalLeg} knee ·
          meniscus repair: {profile.meniscusRepair ? "yes" : "no"}
        </p>
      </header>

      {week && <WeekStrip week={week} />}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-stone-800">Knee bend (flexion)</h2>
          <span className="text-xs text-stone-500">last 3 weeks</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-stone-900">{last.flexionDeg}°</span>
          <span className="text-sm font-medium text-teal-700">+{gain}° since {new Date(first.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
        </div>
        <p className="text-xs text-stone-500">{last.extensionDeg === 0 ? "Fully straight" : `Lacking ${last.extensionDeg}° of full straightening`} · pain yesterday {last.pain}/10</p>
        <RomChart sessions={sessions} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <DemoLink
            href="/rom"
            className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-center text-sm font-medium text-stone-800 active:bg-stone-100"
          >
            📐 Measure from a photo
          </DemoLink>
          <DemoLink
            href="/progress"
            className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-center text-sm font-medium text-stone-800 active:bg-stone-100"
          >
            🗺 My recovery journey
          </DemoLink>
        </div>
      </section>

      {last.note && (
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-medium">Yesterday:</span> {last.note}
        </p>
      )}

      <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-800">Today&apos;s planned workout</h2>
        <ul className="mt-2 divide-y divide-stone-100">
          {todayPlan.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-stone-800">{e.name}</span>
              <span className="text-stone-500">{e.dose}</span>
            </li>
          ))}
        </ul>
      </section>

      <DemoLink
        href="/audit"
        className="mt-6 block rounded-2xl bg-teal-700 px-4 py-4 text-center text-base font-semibold text-white shadow active:bg-teal-800"
      >
        📹 Check my squat form before I train
      </DemoLink>
      <DemoLink
        href="/checkin"
        className="mt-3 block rounded-2xl border-2 border-teal-700 bg-white px-4 py-4 text-center text-base font-semibold text-teal-800 active:bg-teal-50"
      >
        📝 Daily check-in → today&apos;s plan
      </DemoLink>
      <p className="mt-3 text-center text-xs text-stone-500">
        Observations to discuss with your physio or surgeon, not a diagnosis.
      </p>
    </main>
  );
}
