import { waLink } from "@/lib/summary";

// Opens WhatsApp with the progress message ready, on the demo physio's chat.
// No number is built in: without the env var, WhatsApp opens its contact picker with the message ready.
// A real number can be set per deployment in the server env var PHYSIO_WHATSAPP (digits with country code),
// or typed by the patient on their own device (then this route isn't used at all).

export async function GET(req: Request) {
  const text = (new URL(req.url).searchParams.get("text") ?? "").slice(0, 1500);
  const env = (process.env.PHYSIO_WHATSAPP ?? "").replace(/\D/g, "");
  const number = env.length >= 11 ? env : ""; // no number configured → WhatsApp shows its own contact picker
  return Response.redirect(waLink(number, text), 302);
}
