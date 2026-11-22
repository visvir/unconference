import { activity, activityInsight } from "@/lib/activity";

const fmt = (n: number) => n.toLocaleString("en-IN");

// Sample wearable data, shown quietly. The wearable owns general activity; this app owns the knee.
export default function ActivityWidget() {
  const a = activity;
  const insight = activityInsight(a);
  const max = Math.max(...a.week.map((d) => d.steps), a.stepsGoal);
  const last = a.week.length - 1;
  const stats: { label: string; value: string; unit?: string; sub?: string }[] = [
    { label: "Steps", value: fmt(a.today.steps), sub: `/ ${fmt(a.stepsGoal)}` },
    { label: "Active", value: String(a.today.activeMinutes), unit: "min" },
    { label: "Rest HR", value: String(a.today.restingHr), unit: "bpm" },
    { label: "Sleep", value: String(a.today.sleepHours), unit: "h" },
  ];

  return (
    <section className="card mt-6 !p-4" aria-label="Activity from your wearable (sample data)">
      <div className="flex items-center justify-between gap-2">
        <h2 className="eyebrow text-mute">Activity</h2>
        <span className="chip bg-white text-ink shadow-[inset_0_0_0_1.5px_rgb(15_17_21/0.25)]">{a.source} · Sample data</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-mute">{s.label}</p>
            <p className="stat-num mt-1 text-xl">{s.value}</p>
            <p className="mt-0.5 text-[10px] text-mute">{s.sub ?? s.unit}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-10 items-end gap-1.5">
        {a.week.map((d, i) => {
          const isToday = i === last;
          const flagged = i === last - 1 && insight.tone === "watch";
          const color = isToday ? "bg-ink" : flagged ? "bg-coral" : "bg-ink/20";
          return (
            <div
              key={d.day}
              role="img"
              aria-label={`${d.day} ${fmt(d.steps)} steps`}
              className={`flex-1 rounded-sm ${color}`}
              style={{ height: `${Math.max(8, Math.round((d.steps / max) * 100))}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5" aria-hidden="true">
        {a.week.map((d) => (
          <span key={d.day} className="flex-1 text-center text-[10px] font-semibold text-mute">{d.day[0]}</span>
        ))}
      </div>
      <p className={`mt-2 text-xs leading-snug ${insight.tone === "watch" ? "text-ink" : "text-mute"}`}>
        {insight.tone === "watch" && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" aria-hidden="true" />}
        {insight.text}
      </p>
      <p className="note mt-1.5">Your wearable tracks general activity. ACL Co-pilot focuses on the knee.</p>
    </section>
  );
}
