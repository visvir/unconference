import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const maxDuration = 30;

const bodySchema = z.object({
  checkInText: z.string().min(1).max(600),
  decision: z.enum(["deload", "proceed"]),
  reasons: z.array(z.string().max(200)).max(10),
  kept: z.array(z.string().max(100)).max(20),
  removed: z.array(z.string().max(100)).max(20),
  demo: z.boolean().optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;

  if (b.demo) {
    try {
      const cached = JSON.parse(
        await readFile(path.join(process.cwd(), "data", "cache", `explain-${b.decision}.json`), "utf8"),
      ) as { checkInText: string; explanation: string };
      // Only the scripted example is cached; anything else typed in demo mode goes live.
      const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");
      if (norm(cached.checkInText) === norm(b.checkInText)) {
        return Response.json({ explanation: cached.explanation, cached: true });
      }
    } catch {
      /* fall through to live */
    }
  }

  try {
    const client = new Anthropic({ timeout: 20_000, maxRetries: 0 });
    const msg = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 1000,
      output_config: { effort: "low" },
      system:
        "You are a warm, concise ACL-rehab physiotherapist texting a patient. The plan decision has ALREADY been made by fixed safety rules; never change it, add exercises, or give medical diagnoses. " +
        "Write exactly 2 short sentences explaining today's plan and why, in the SAME language and register the patient used (Hinglish in Roman script if they wrote Hinglish, English if English). " +
        "Mention the specific reason(s). End by suggesting they mention it to their physio. No emojis, no markdown.",
      messages: [
        {
          role: "user",
          content: `Patient's check-in: "${b.checkInText}"
Decision: ${b.decision === "deload" ? "DELOAD today (lighter day)" : "PROCEED with the planned workout"}
Why (from the rules): ${b.reasons.join("; ")}
Today's exercises: ${b.kept.join(", ")}
${b.removed.length ? `Removed today: ${b.removed.join(", ")}` : ""}`,
        },
      ],
    });
    const text = msg.content.find((c) => c.type === "text");
    return Response.json({ explanation: text && "text" in text ? text.text.trim() : "" });
  } catch (e) {
    console.error("explain failed", e);
    // The plan itself is deterministic, so the screen still works without the explanation.
    return Response.json({ explanation: "" });
  }
}
