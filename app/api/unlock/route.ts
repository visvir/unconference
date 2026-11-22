import { codeMatches, LIVE_COOKIE, liveAllowed, tokenFor } from "@/lib/guard";

// Owner unlock for live (paid) analysis. The passcode lives only in the server env var DEMO_ACCESS_CODE.
const cookie = (value: string, maxAge: number) =>
  `${LIVE_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

export async function GET(req: Request) {
  return Response.json({ live: liveAllowed(req) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  let code = "";
  try {
    code = String(((await req.json()) as { code?: unknown }).code ?? "").slice(0, 200);
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const configured = process.env.DEMO_ACCESS_CODE;
  if (!codeMatches(configured, code)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return Response.json({ error: "That passcode isn't right." }, { status: 401 });
  }
  return Response.json({ live: true }, { headers: { "Set-Cookie": cookie(tokenFor(configured!), 60 * 60 * 12), "Cache-Control": "no-store" } });
}

export async function DELETE() {
  return Response.json({ live: false }, { headers: { "Set-Cookie": cookie("", 0), "Cache-Control": "no-store" } });
}
