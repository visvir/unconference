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
        className="btn btn-secondary w-full"
      >
        {open ? "Show full plan" : "⏱ Only 10 minutes today?"}
      </button>
      {open && (
        <section className="card-volt mt-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-bold">Your 10-minute version</h2>
            <span className="stat-num text-3xl">{totalMin} min</span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {keep.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-2 text-sm text-ink">
                <span>✓ {e.name}</span>
                <span className="text-ink/80">
                  {e.dose} · {e.minutes ?? 5} min
                </span>
              </li>
            ))}
          </ul>
          {recovery.length > 0 && (
            <p className="mt-2 text-xs text-ink/70">
              Later today: {recovery.map((e) => `${e.name}, ${e.minutes ?? 5} min`).join("; ")}
            </p>
          )}
          <p className="mt-3 text-sm font-bold">A short session beats a skipped one.</p>
          <p className="mt-1 text-[11px] text-ink/70">Chosen by a fixed rule: most protective exercises first.</p>
        </section>
      )}
    </div>
  );
}
