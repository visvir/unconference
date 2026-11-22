import { connection, NextResponse } from "next/server";
import { authUrl, cookieFlags, healthEnabled, newState, STATE_COOKIE } from "@/lib/health";

// Starts the OAuth code flow. 404 unless the three GOOGLE_HEALTH_* server env vars are set.

export async function GET(req: Request) {
  await connection(); // always per request: never prerender env-dependent or per-user responses
  if (!healthEnabled()) return new Response("Not found", { status: 404 });
  const origin = new URL(req.url).origin;
  const state = newState();
  const res = NextResponse.redirect(authUrl(origin, state), 302);
  res.cookies.set(STATE_COOKIE, state, { ...cookieFlags(origin), maxAge: 600 }); // CSRF state, 10 min
  return res;
}
