import { connection, NextResponse, type NextRequest } from "next/server";
import { cookieFlags, exchangeCode, healthEnabled, seal, stateMatches, STATE_COOKIE, TOKEN_COOKIE } from "@/lib/health";

// OAuth redirect target: checks state, swaps the code for a token, stores it encrypted in an httpOnly cookie.
// Any failure goes back to "/?health=error" with no details.

export async function GET(req: NextRequest) {
  await connection(); // always per request: never prerender env-dependent or per-user responses
  if (!healthEnabled()) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const origin = url.origin;
  const fail = () => {
    const r = NextResponse.redirect(`${origin}/?health=error`, 302);
    r.cookies.delete(STATE_COOKIE);
    return r;
  };
  const code = url.searchParams.get("code");
  if (!code || !stateMatches(req.cookies.get(STATE_COOKIE)?.value, url.searchParams.get("state"))) return fail();
  const token = await exchangeCode(origin, code).catch(() => null);
  if (!token) return fail();
  const res = NextResponse.redirect(`${origin}/`, 302);
  res.cookies.delete(STATE_COOKIE);
  res.cookies.set(TOKEN_COOKIE, seal(token), { ...cookieFlags(origin), maxAge: 3600 }); // access tokens last about 1 h
  return res;
}
