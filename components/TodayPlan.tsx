"use client";

import { useSyncExternalStore } from "react";
import { loadNotes } from "@/lib/flow";
import { applyNotes } from "@/lib/notes";
import type { Exercise } from "@/lib/types";

// Home's plan list. Shows the seeded plan, and the physio's applied advice once the patient has added it.
export default function TodayPlan({ planned }: { planned: Exercise[] }) {
  const notes = useSyncExternalStore(() => () => {}, loadNotes, () => null);
  const applied = notes?.usable ? applyNotes(planned, notes.instructions) : null;
  const list = applied ? applied.exercises : planned;
  return (
    <>
      {applied && applied.changes.length > 0 && (
        <p className="mt-2">
          <span className="chip chip-volt">Updated with your physio&apos;s advice ({applied.changes.length} changes)</span>
        </p>
      )}
      <ul className="mt-2 divide-y divide-black/5">
        {list.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <span className="font-semibold text-ink">
              {e.name}
              {e.kind === "loading" && <span className="chip chip-ink ml-2 align-middle">load</span>}
            </span>
            <span className="shrink-0 text-mute">{e.dose}</span>
          </li>
        ))}
      </ul>
      {applied && applied.changes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {applied.changes.map((c, n) => (
            <li key={n} className="text-xs text-mute">
              {c.text}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
