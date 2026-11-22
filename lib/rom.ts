import { z } from "zod";

export const romSchema = z.object({
  photo_usable: z.boolean(),
  unusable_reason: z.string().describe("if not usable: how to retake, one sentence; else empty"),
  flexionDeg: z.number().describe("knee flexion in degrees, nearest 5; 0 if not usable"),
  confidence: z.enum(["low", "medium", "high"]),
  observation: z.string().describe("one plain sentence on what the estimate is based on"),
});

export type RomResult = z.infer<typeof romSchema>;

export function romSystemPrompt(leg: string) {
  return `You are an experienced physiotherapist estimating KNEE FLEXION from one photo of a patient's ${leg} knee. The photo should be taken from the SIDE with the knee bent as far as is comfortable (lying heel slide, sitting, or the bottom of a squat).

Flexion is the angle the shin has moved from a straight leg: 0° = fully straight, 90° = a right angle, about 135–150° = heel near the buttock.

Method: find the hip, knee and ankle. Imagine the thigh line (hip to knee) and the shin line (knee to ankle). The interior angle between them, subtracted from 180, is the flexion. Give the nearest 5°.

Rules:
- Set photo_usable=false if the photo is not roughly side-on, the hip, knee and ankle are not all visible, clothing hides the leg line, or there is no clearly bent or straight leg. Then say how to retake in one sentence: "Take the photo from the side, at knee height, with hip, knee and ankle all in frame". Set flexionDeg 0.
- confidence is "high" only when the photo is side-on, close and unobstructed. Use "low" when you are guessing.
- observation: one plain sentence saying what the estimate is based on.
- This is an estimate to discuss with the physio, not a measurement. Never diagnose.`;
}

// Deterministic clean-up of the model output.
export function cleanRom(o: RomResult): RomResult {
  if (!o.photo_usable) return { ...o, flexionDeg: 0, confidence: "low" };
  const deg = Math.max(0, Math.min(160, Math.round((Number(o.flexionDeg) || 0) / 5) * 5));
  return { ...o, flexionDeg: deg };
}
