import { waLink } from "@/lib/summary";

// Opens WhatsApp on the demo physio's chat with the message ready.
// The number lives only in the server environment (PHYSIO_WHATSAPP): it is not in the repo or the page source.
// Without it, WhatsApp shows its own contact picker.
export async function GET(req: Request) {
  const text = (new URL(req.url).searchParams.get("text") ?? "").slice(0, 1500);
  return Response.redirect(waLink(process.env.PHYSIO_WHATSAPP ?? "", text), 302);
}
