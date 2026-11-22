import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import patientJson from "@/data/patient.json";
import { notesSchema, notesSystemPrompt } from "@/lib/notes";
import type { PatientData } from "@/lib/types";

export const maxDuration = 60;

// Input contract: exactly one of text / pdf / sample. Rejects bad input with a 400 before any paid call.
const bodySchema = z
  .object({
    text: z.string().min(10).max(6000).optional(),
    pdf: z.string().min(1).max(3_000_000).optional(),
    sample: z.string().max(40).optional(),
  })
  .refine((b) => [b.text, b.pdf, b.sample].filter((v) => v !== undefined).length === 1);

const planned = (patientJson as unknown as PatientData).todayPlan.map((e) => ({ id: e.id, name: e.name }));

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = bodySchema.safeParse(raw);
  if (!input.success) return Response.json({ error: "Send the note as text or a PDF" }, { status: 400 });
  const body = input.data;

  // Demo mode: the bundled sample note → its cached real response. Zero network.
  if (body.sample) {
    const name = body.sample.replace(/[^a-z0-9_-]/gi, "");
    try {
      const cached = await readFile(path.join(process.cwd(), "data", "cache", `notes-${name}.json`), "utf8");
      return Response.json({ ...JSON.parse(cached), cached: true });
    } catch {
      return Response.json({ error: `No cached note for ${name}` }, { status: 404 });
    }
  }

  const content: Anthropic.ContentBlockParam[] = body.pdf
    ? [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: body.pdf } },
        { type: "text", text: "Extract the physio's instructions." },
      ]
    : [{ type: "text", text: `Physio's note:\n${body.text}` }];

  try {
    const client = new Anthropic({ timeout: 40_000, maxRetries: 0 });
    const msg = await client.messages.parse({
      model: "claude-sonnet-5-5",
      max_tokens: 2000,
      system: notesSystemPrompt(planned),
      output_config: { effort: "low", format: zodOutputFormat(notesSchema) },
      messages: [{ role: "user", content }],
    });
    const out = msg.parsed_output;
    if (!out) return Response.json({ error: "The model returned an unexpected format, please try again." }, { status: 502 });
    // Deterministic clean-up: trim, cap at 12, only keep matchIds that are really planned.
    const ids = new Set(planned.map((e) => e.id));
    return Response.json({
      usable: out.usable,
      unusable_reason: out.unusable_reason.trim(),
      from: out.from.trim(),
      instructions: out.usable
        ? out.instructions.slice(0, 12).map((i) => ({
            action: i.action,
            exercise: i.exercise.trim(),
            matchId: ids.has(i.matchId.trim()) ? i.matchId.trim() : "",
            dose: i.dose.trim(),
            quote: i.quote.trim().slice(0, 160),
          }))
        : [],
    });
  } catch (e) {
    console.error("notes failed", e);
    return Response.json({ error: "Reading the note is unavailable right now, please try again." }, { status: 502 });
  }
}
