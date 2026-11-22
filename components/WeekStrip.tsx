export default function WeekStrip({ week }: { week: { planned: number; done: number; missed: string[] } }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow text-mute">This week</h2>
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: week.planned }, (_, i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 border-ink ${i < week.done ? "bg-ink" : "bg-transparent"}`} />
          ))}
        </div>
      </div>
      <p className="mt-2 text-lg font-bold text-ink">
        {week.done} of {week.planned} sessions done
      </p>
      {week.missed.length > 0 && <p className="mt-0.5 text-xs text-mute">Missed: {week.missed.join(", ")}</p>}
    </section>
  );
}
