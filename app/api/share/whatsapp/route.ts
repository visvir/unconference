import { waLink } from "@/lib/summary";

// Opens WhatsApp with the progress message ready, on the demo physio's chat.
// The default is a dummy placeholder number, so no real person's number is in the repo or the page.
// A real number can be set per deployment in the server env var PHYSIO_WHATSAPP (digits with country code),
// or typed by the patient on their own device (then this route isn't used at all).
const DUMMY_PHYSIO = "919999999999";

export async function GET(req: Request) {
  const text = (new URL(req.url).searchParams.get("text") ?? "").slice(0, 1500);
  const env = (process.env.PHYSIO_WHATSAPP ?? "").replace(/\D/g, "");
  const number = env.length >= 11 ? env : DUMMY_PHYSIO; // ignore an empty or malformed setting
  return Response.redirect(waLink(number, text), 302);
}
