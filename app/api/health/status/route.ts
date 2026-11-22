import { connection, type NextRequest } from "next/server";
import { healthEnabled, TOKEN_COOKIE, unseal } from "@/lib/health";

// Tells the widget whether the feature is on (server env set) and whether this browser holds a valid token cookie.

export async function GET(req: NextRequest) {
  await connection(); // always per request: never prerender env-dependent or per-user responses
  const enabled = healthEnabled();
  const connected = enabled && unseal(req.cookies.get(TOKEN_COOKIE)?.value) !== null;
  return Response.json({ enabled, connected }, { headers: { "Cache-Control": "no-store" } });
}
