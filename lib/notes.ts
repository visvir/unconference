// A physio's note → structured instructions (AI reads) → plan changes (plain code applies).
import { z } from "zod";
import type { Exercise } from "./types.ts";

export const instructionSchema = z.object({
  action: z.enum(["add", "remove", "change", "caution"]),
  exercise: z.string(), // plain name as written
  matchId: z.string(), // "" or one of the patient's planned exercise ids
  dose: z.string(), // "" if none
  quote: z.string(), // the physio's own words, verbatim
});

export const notesSchema = z.object({
  usable: z.boolean(),
  unusable_reason: z.string(),
  from: z.string(), // who wrote it, "" if unknown
  instructions: z.array(instructionSchema),
});

export type Instruction = z.infer<typeof instructionSchema>;
export type PhysioNotes = z.infer<typeof notesSchema>;
export type NoteChange = { kind: "added" | "removed" | "changed" | "caution"; text: string; quote: string };

export function notesSystemPrompt(planned: { id: string; name: string }[]): string {
  const list = planned.map((e) => `- ${e.id}: ${e.name}`).join("\n");
  return `You extract instructions from a physiotherapist's note for an ACL-rehab patient.

Rules:
- Extract ONLY what the note says. Never invent or infer clinical advice. One instruction per distinct piece of advice.
- action "add" = start doing something new. "remove" = stop, pause or avoid an exercise. "change" = alter the dose, depth or frequency of an exercise. "caution" = a warning or general advice that changes no exercise (e.g. "ice after every session", "no running until week 14").
- exercise = the plain name as written. dose = the sets/reps/depth/duration as written, or "" if none.
- matchId: set it ONLY when the instruction clearly names one of the patient's planned exercises below, otherwise "".
- quote = the physio's own words for that instruction, verbatim, at most 160 characters.
- from = who wrote the note, or "" if unknown.
- If the text is not physio or medical rehab advice, set usable=false with a one-sentence unusable_reason and no instructions.

Patient's planned exercises:
${list}`;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

export function applyNotes(planned: Exercise[], instructions: Instruction[]): { exercises: Exercise[]; changes: NoteChange[] } {
  let exercises = planned.map((e) => ({ ...e }));
  const changes: NoteChange[] = [];
  for (const i of instructions) {
    const hit = i.matchId ? exercises.find((e) => e.id === i.matchId) : undefined;
    const label = i.dose ? `${i.exercise}, ${i.dose}` : i.exercise;
    if (i.action === "remove") {
      if (hit) {
        exercises = exercises.filter((e) => e.id !== hit.id);
        changes.push({ kind: "removed", text: `Stop: ${hit.name}`, quote: i.quote });
      } else {
        changes.push({ kind: "caution", text: `Physio says to stop: ${i.exercise}`, quote: i.quote });
      }
    } else if (i.action === "change") {
      if (hit && i.dose) {
        exercises = exercises.map((e) => (e.id === hit.id ? { ...e, dose: i.dose } : e));
        changes.push({ kind: "changed", text: `${hit.name}: ${i.dose}`, quote: i.quote });
      } else {
        changes.push({ kind: "caution", text: label, quote: i.quote });
      }
    } else if (i.action === "add") {
      const dup = exercises.some((e) => e.name.toLowerCase() === i.exercise.trim().toLowerCase());
      const id = `physio_${slug(i.exercise)}`;
      if (!dup && slug(i.exercise)) {
        exercises.push({ id, name: i.exercise.trim(), dose: i.dose, kind: "loading", minutes: 5, priority: 7 });
        changes.push({ kind: "added", text: `Add: ${label}`, quote: i.quote });
      }
    } else {
      changes.push({ kind: "caution", text: label, quote: i.quote });
    }
  }
  return { exercises, changes };
}
