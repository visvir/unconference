import { NextResponse, type NextRequest } from "next/server";
import { healthEnabled, revoke, TOKEN_COOKIE, unseal } from "@/lib/health";

// Revokes the token at Google and clears the cookie.

export async function POST(req: NextRequest) {
  if (!healthEnabled()) return new Response("Not found", { status: 404 });
  const token = unseal(req.cookies.get(TOKEN_COOKIE)?.value);
  if (token) await revoke(token);
  const res = NextResponse.json({ connected: false }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.delete(TOKEN_COOKIE);
  return res;
}
