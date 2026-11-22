export default function WeekStrip({ week }: { week: { planned: number; done: number; missed: string[] } }) {
  return (
    <section className="mb-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-800">This week</h2>
        <div className="flex gap-1.5" aria-hidden="true">
          {Array.from({ length: week.planned }, (_, i) => (
            <span key={i} className={`h-3 w-3 rounded-full border-2 border-teal-700 ${i < week.done ? "bg-teal-700" : "bg-white"}`} />
          ))}
        </div>
      </div>
      <p className="mt-1 text-sm text-stone-700">
        {week.done} of {week.planned} sessions done
      </p>
      {week.missed.length > 0 && <p className="mt-0.5 text-xs text-stone-500">Missed: {week.missed.join(", ")}</p>}
    </section>
  );
}
