import Anthropic from "@anthropic-ai/sdk";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const maxDuration = 30;

type Body = {
  checkInText: string;
  decision: "deload" | "proceed";
  reasons: string[];
  kept: string[];
  removed: string[];
  demo?: boolean;
};

export async function POST(req: Request) {
  const b = (await req.json()) as Body;

  if (b.demo) {
    try {
      const cached = await readFile(path.join(process.cwd(), "data", "cache", `explain-${b.decision}.json`), "utf8");
      return Response.json({ ...JSON.parse(cached), cached: true });
    } catch {
      /* fall through to live */
    }
  }

  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 300,
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
