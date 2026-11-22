import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { auditSchema, auditSystemPrompt } from "@/lib/audit";
import { liveAllowed, lockedResponse } from "@/lib/guard";

export const maxDuration = 60;

// Input contract. Rejects bad input with a 400 before any paid model call.
const MAX_FRAME_B64 = 1_000_000; // ~750 KB JPEG; real frames (480 px) are ~40 KB
const bodySchema = z.object({
  sample: z.string().max(40).optional(),
  leg: z.enum(["left", "right"]).optional(),
  frames: z
    .array(z.object({ t: z.number().min(0).max(3600), data: z.string().min(1).max(MAX_FRAME_B64) }))
    .max(12)
    .optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const input = bodySchema.safeParse(raw);
  if (!input.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const body = input.data;

  // Demo mode: a bundled sample video → its cached real response. Zero network.
  if (body.sample) {
    const name = body.sample.replace(/[^a-z0-9_-]/gi, "");
    try {
      const cached = await readFile(path.join(process.cwd(), "data", "cache", `audit-${name}.json`), "utf8");
      return Response.json({ ...JSON.parse(cached), cached: true });
    } catch {
      if (!body.frames?.length) return Response.json({ error: `No cached audit for ${name}` }, { status: 404 });
    }
  }

  const frames = body.frames ?? [];
  if (frames.length === 0 || frames.length > 12) {
    return Response.json({ error: "Send 1–12 frames" }, { status: 400 });
  }
  const leg = body.leg ?? "right";

  const content: Anthropic.ContentBlockParam[] = [];
  for (const f of frames) {
    content.push({ type: "text", text: `Frame at t=${f.t.toFixed(1)}s` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.data } });
  }
  content.push({ type: "text", text: `Review this two-leg squat. The ${leg} knee is the operated one.` });

  if (!liveAllowed(req)) return lockedResponse(); // owner lock: no paid call for the public

  try {
    // One attempt, well inside Vercel's 60 s limit, so the UI gets a JSON error instead of a 504.
    const client = new Anthropic({ timeout: 40_000, maxRetries: 0 });
    const msg = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      system: auditSystemPrompt(leg),
      output_config: { effort: "medium", format: zodOutputFormat(auditSchema) },
      messages: [{ role: "user", content }],
    });
    const out = msg.parsed_output;
    if (!out) {
      return Response.json({ error: "The model returned an unexpected format, please try again." }, { status: 502 });
    }
    // Deterministic clean-up: clamp severity, keep exactly 2 cues, drop findings on unusable video.
    const parsed = {
      data: {
        ...out,
        findings: out.video_usable
          ? out.findings.map((f) => ({
              ...f,
              severity: Math.max(0, Math.min(3, Math.round(f.severity))),
              cues: [f.cues[0] ?? "", f.cues[1] ?? ""],
            }))
          : [],
      },
    };
    return Response.json(parsed.data);
  } catch (e) {
    console.error("audit failed", e);
    return Response.json({ error: "Form check is unavailable right now, please try again." }, { status: 502 });
  }
}
