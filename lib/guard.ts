// Owner lock for anything that spends money (Claude vision, Claude text, Sarvam speech-to-text).
// Public visitors get the bundled samples, which replay saved responses and cost nothing.
// The owner enters a passcode once at /unlock; that sets an httpOnly cookie for this browser.
// In production the lock fails closed: with no passcode configured, nothing paid can run.
import { createHash, timingSafeEqual } from "node:crypto";

export const LIVE_COOKIE = "acl_live";
export const MIN_CODE_LENGTH = 12;

const sha = (s: string) => createHash("sha256").update(s).digest();

// What the cookie holds: a hash derived from the passcode, never the passcode itself.
export function tokenFor(code: string): string {
  return sha(`acl-live-v1:${code}`).toString("hex");
}

const same = (a: string, b: string) => timingSafeEqual(sha(a), sha(b)); // constant time, any lengths

export function codeMatches(configured: string | undefined, given: string): boolean {
  if (!configured || configured.length < MIN_CODE_LENGTH) return false;
  return same(configured, given);
}

export function liveDecision(o: { production: boolean; code: string | undefined; cookie: string | undefined }): boolean {
  if (!o.production) return true;
  if (!o.code || o.code.length < MIN_CODE_LENGTH || !o.cookie) return false;
  return same(tokenFor(o.code), o.cookie);
}

function cookieFrom(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function liveAllowed(req: Request): boolean {
  return liveDecision({
    production: process.env.NODE_ENV === "production",
    code: process.env.DEMO_ACCESS_CODE,
    cookie: cookieFrom(req, LIVE_COOKIE),
  });
}

export const LOCKED_MESSAGE =
  "Live analysis is switched off on this public demo. Please try one of the samples.";

export function lockedResponse(): Response {
  return Response.json({ error: LOCKED_MESSAGE, locked: true }, { status: 403 });
}
