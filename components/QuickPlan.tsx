"use client";

import { useState } from "react";
import { shortPlan } from "@/lib/rules";
import type { Exercise } from "@/lib/types";

export default function QuickPlan({ exercises }: { exercises: Exercise[] }) {
  const [open, setOpen] = useState(false);
  const { keep, later, totalMin } = shortPlan(exercises);
  const recovery = later.filter((e) => e.kind === "recovery");

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="min-h-12 w-full rounded-2xl border-2 border-teal-700 bg-white px-4 text-base font-semibold text-teal-800 active:bg-teal-50"
      >
        {open ? "Show full plan" : "⏱ Only 10 minutes today?"}
      </button>
      {open && (
        <section className="mt-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-teal-900">Your 10-minute version</h2>
            <span className="text-sm font-semibold text-teal-800">{totalMin} min</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {keep.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-2 text-sm text-stone-800">
                <span>✓ {e.name}</span>
                <span className="text-stone-600">
                  {e.dose} · {e.minutes ?? 5} min
                </span>
              </li>
            ))}
          </ul>
          {recovery.length > 0 && (
            <p className="mt-2 text-xs text-stone-500">
              Later today: {recovery.map((e) => `${e.name}, ${e.minutes ?? 5} min`).join("; ")}
            </p>
          )}
          <p className="mt-3 text-sm font-medium text-teal-900">A short session beats a skipped one.</p>
          <p className="mt-1 text-[11px] text-stone-500">Chosen by a fixed rule: most protective exercises first.</p>
        </section>
      )}
    </div>
  );
}
