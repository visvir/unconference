import { connection, type NextRequest } from "next/server";
import { activity } from "@/lib/activity";
import { fetchDailyActivity, healthEnabled, isIsoDate, mergeActivity, TOKEN_COOKIE, unseal } from "@/lib/health";

// Fetches today's and yesterday's activity for THIS browser's token only. Never cached, never logged.
// ?date=YYYY-MM-DD is the browser's local date, so "today" matches the patient's day.
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  await connection(); // always per request: never prerender env-dependent or per-user responses
  if (!healthEnabled()) return new Response("Not found", { status: 404 });
  const token = unseal(req.cookies.get(TOKEN_COOKIE)?.value);
  if (!token) return Response.json({ connected: false }, { status: 401, headers: NO_STORE });
  const q = new URL(req.url).searchParams.get("date") ?? "";
  const today = isIsoDate(q) ? q : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const real = await fetchDailyActivity(token, today).catch(() => null);
  if (!real) {
    return Response.json(
      { connected: true, error: "Couldn't reach Google Health just now. Try again in a minute." },
      { status: 502, headers: NO_STORE },
    );
  }
  return Response.json({ connected: true, activity: mergeActivity(activity, real) }, { headers: NO_STORE });
}
