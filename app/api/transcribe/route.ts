// Voice check-in: browser recording -> Sarvam speech-to-text -> text for the check-in box.
// Verified against https://docs.sarvam.ai/api-reference/speech-to-text/transcribe (.md):
//   POST https://api.sarvam.ai/speech-to-text, multipart field `file`, header api-subscription-key,
//   model saaras:v4 (default), WebM/Opus and MP4/M4A accepted, language_code=unknown auto-detects.
// Output script: we use mode=translit (Romanization: Hindi/Hinglish speech -> Latin script).
// Chosen over `translate` (English) because it keeps the patient's own words ("pindli", "bukhar"),
// and over `codemix`/`transcribe`, which emit Devanagari that checkRedFlags cannot match.
export const maxDuration = 30;

const MIN_BYTES = 1024;
const MAX_BYTES = 4 * 1024 * 1024;

const err = (error: string, status: number) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const key = process.env.SARVAM_API_KEY;
  if (!key) return err("Voice is not configured", 503);

  let audio: FormDataEntryValue | null = null;
  try {
    audio = (await req.formData()).get("audio");
  } catch {
    return err("Send multipart/form-data with an audio field", 400);
  }
  if (!audio || typeof audio === "string") return err("Missing audio", 400);
  if (audio.size <= MIN_BYTES) return err("Recording too short", 400);
  if (audio.size > MAX_BYTES) return err("Recording too large", 400);

  const type = (audio.type || "audio/webm").split(";")[0];
  const ext = type.includes("mp4") ? "mp4" : type.includes("ogg") ? "ogg" : "webm";
  const fd = new FormData();
  fd.append("file", new Blob([await audio.arrayBuffer()], { type }), `checkin.${ext}`);
  fd.append("model", "saaras:v4");
  fd.append("mode", "translit");
  fd.append("language_code", "unknown");

  try {
    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": key },
      body: fd,
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error("sarvam stt", res.status, (await res.text()).slice(0, 300));
      return err("Could not transcribe, please type instead.", 502);
    }
    const j = (await res.json()) as { transcript?: string; language_code?: string | null };
    return Response.json({ text: (j.transcript ?? "").trim(), language: j.language_code ?? undefined });
  } catch (e) {
    console.error("sarvam stt failed", e instanceof Error ? e.message : e);
    return err("Could not transcribe, please type instead.", 502);
  }
}
