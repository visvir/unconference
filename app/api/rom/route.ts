import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { cleanRom, romSchema, romSystemPrompt } from "@/lib/rom";
import { liveAllowed, lockedResponse } from "@/lib/guard";

export const maxDuration = 60;

// Input contract. Rejects bad input with a 400 before any paid model call.
const bodySchema = z.object({
  sample: z.string().max(40).optional(),
  leg: z.enum(["left", "right"]).optional(),
  image: z.string().min(1000).max(1_500_000).optional(),
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

  // Demo mode: a bundled sample photo → its cached real response. Zero network.
  if (body.sample) {
    const name = body.sample.replace(/[^a-z0-9_-]/gi, "");
    try {
      const cached = await readFile(path.join(process.cwd(), "data", "cache", `rom-${name}.json`), "utf8");
      return Response.json({ ...JSON.parse(cached), cached: true });
    } catch {
      if (!body.image) return Response.json({ error: `No cached photo for ${name}` }, { status: 404 });
    }
  }

  if (!body.image) return Response.json({ error: "Send a photo" }, { status: 400 });
  const leg = body.leg ?? "right";

  if (!liveAllowed(req)) return lockedResponse(); // owner lock: no paid call for the public

  try {
    // One attempt, well inside Vercel's 60 s limit, so the UI gets a JSON error instead of a 504.
    const client = new Anthropic({ timeout: 40_000, maxRetries: 0 });
    const msg = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 2000,
      system: romSystemPrompt(leg),
      output_config: { effort: "medium", format: zodOutputFormat(romSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: body.image } },
            { type: "text", text: `Estimate knee flexion for the ${leg} knee.` },
          ],
        },
      ],
    });
    const out = msg.parsed_output;
    if (!out) {
      return Response.json({ error: "The model returned an unexpected format, please try again." }, { status: 502 });
    }
    return Response.json(cleanRom(out));
  } catch (e) {
    console.error("rom failed", e);
    return Response.json({ error: "The angle estimate is unavailable right now, please try again." }, { status: 502 });
  }
}
