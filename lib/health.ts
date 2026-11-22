// Optional, real Google Health API connection for the Activity widget. SERVER ONLY (used by app/api/health/*).
// OFF unless GOOGLE_HEALTH_CLIENT_ID, GOOGLE_HEALTH_CLIENT_SECRET and GOOGLE_HEALTH_COOKIE_KEY are all set.
// Privacy: nothing here logs, writes to disk or caches. The access token only ever lives inside an
// AES-256-GCM encrypted httpOnly cookie in the user's own browser.
//
// API: Google Health API v4 (successor of the Fitbit Web API and the Google Fit REST API).
// Docs: https://developers.google.com/health  ·  https://developers.google.com/health/data-types/steps
//       https://developers.google.com/health/reference/rest/v4/users.dataTypes.dataPoints/dailyRollUp
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Activity } from "./activity";

export const SCOPE = "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly";
export const TOKEN_COOKIE = "gh_token";
export const STATE_COOKIE = "gh_state";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const API = "https://health.googleapis.com/v4/users/me/dataTypes";

type Env = Record<string, string | undefined>;
export type ActivityDay = { stepsToday: number; stepsYesterday: number; activeMinutesToday?: number };

export function healthEnabled(env: Env = process.env): boolean {
  return Boolean(env.GOOGLE_HEALTH_CLIENT_ID && env.GOOGLE_HEALTH_CLIENT_SECRET && (env.GOOGLE_HEALTH_COOKIE_KEY ?? "").length >= 32);
}

export const redirectUri = (origin: string) => `${origin}/api/health/callback`;

export function authUrl(origin: string, state: string, clientId = process.env.GOOGLE_HEALTH_CLIENT_ID ?? ""): string {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: SCOPE,
    state,
    access_type: "online",
    include_granted_scopes: "false",
  });
  return `${AUTH_ENDPOINT}?${p}`;
}

// Constant-time state comparison; anything missing fails.
export function stateMatches(expected: string | null | undefined, got: string | null | undefined): boolean {
  if (!expected || !got) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const newState = () => randomBytes(24).toString("base64url");

// --- cookie encryption: AES-256-GCM, key = sha256(GOOGLE_HEALTH_COOKIE_KEY), random 12-byte IV ---
const keyOf = (secret: string) => createHash("sha256").update(secret).digest();

export function seal(plain: string, secret = process.env.GOOGLE_HEALTH_COOKIE_KEY ?? ""): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyOf(secret), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64url");
}

export function unseal(sealed: string | undefined, secret = process.env.GOOGLE_HEALTH_COOKIE_KEY ?? ""): string | null {
  if (!sealed) return null;
  try {
    const raw = Buffer.from(sealed, "base64url");
    if (raw.length < 29) return null;
    const d = createDecipheriv("aes-256-gcm", keyOf(secret), raw.subarray(0, 12));
    d.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null; // tampered, wrong key or garbage
  }
}

// --- OAuth code exchange and revoke ---
export async function exchangeCode(origin: string, code: string): Promise<string | null> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_HEALTH_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_HEALTH_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token?: unknown };
  return typeof j.access_token === "string" ? j.access_token : null;
}

export async function revoke(token: string): Promise<void> {
  await fetch(REVOKE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    cache: "no-store",
  }).catch(() => undefined);
}

// --- data: dailyRollUp over [yesterday 00:00, tomorrow 00:00) in the user's civil (local) time ---
export const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

const shift = (iso: string, days: number) => {
  const t = new Date(`${iso}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
};
const civil = (iso: string, days: number) => ({ date: shift(iso, days), time: { hours: 0, minutes: 0, seconds: 0, nanos: 0 } });

export function rollupRange(todayIso: string) {
  return { start: civil(todayIso, -1), end: civil(todayIso, 1) };
}

type CivilDate = { year?: number; month?: number; day?: number };
type RollupPoint = {
  civilStartTime?: { date?: CivilDate };
  steps?: { countSum?: string | number };
  activeZoneMinutes?: { sumInCardioHeartZone?: string; sumInPeakHeartZone?: string; sumInFatBurnHeartZone?: string };
};
const sameDay = (a: CivilDate | undefined, b: { year: number; month: number; day: number }) =>
  !!a && a.year === b.year && a.month === b.month && a.day === b.day;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Maps a documented dailyRollUp response for steps to today/yesterday. Unexpected shape -> null.
export function mapDailyRollup(json: unknown, todayIso: string): ActivityDay | null {
  const pts = (json as { rollupDataPoints?: unknown } | null)?.rollupDataPoints;
  if (json && typeof json === "object" && Object.keys(json).length === 0) return { stepsToday: 0, stepsYesterday: 0 }; // empty = no data
  if (!Array.isArray(pts)) return null;
  const find = (days: number) => (pts as RollupPoint[]).find((p) => sameDay(p.civilStartTime?.date, shift(todayIso, days)));
  return { stepsToday: num(find(0)?.steps?.countSum), stepsYesterday: num(find(-1)?.steps?.countSum) };
}

// Sum of active zone minutes for today, from the same response shape (best effort; unverified data type id).
export function mapActiveZoneMinutes(json: unknown, todayIso: string): number | undefined {
  const pts = (json as { rollupDataPoints?: RollupPoint[] } | null)?.rollupDataPoints;
  const z = Array.isArray(pts) ? pts.find((p) => sameDay(p.civilStartTime?.date, shift(todayIso, 0)))?.activeZoneMinutes : undefined;
  return z ? num(z.sumInCardioHeartZone) + num(z.sumInPeakHeartZone) + num(z.sumInFatBurnHeartZone) : undefined;
}

async function rollup(token: string, dataType: string, todayIso: string): Promise<unknown> {
  const res = await fetch(`${API}/${dataType}/dataPoints:dailyRollUp`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ range: rollupRange(todayIso), windowSizeDays: 1 }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`health api ${res.status}`); // status only, never the body
  return res.json();
}

// Adapter: the only function that knows the Google Health API shape for activity.
export async function fetchDailyActivity(token: string, todayIso: string): Promise<ActivityDay | null> {
  const steps = mapDailyRollup(await rollup(token, "steps", todayIso), todayIso);
  if (!steps) return null;
  // Active zone minutes are optional: if this data type id or shape differs, we just leave it out.
  const azm = await rollup(token, "active-zone-minutes", todayIso).then((j) => mapActiveZoneMinutes(j, todayIso)).catch(() => undefined);
  return azm === undefined ? steps : { ...steps, activeMinutesToday: azm };
}

// Overlays real numbers on the sample structure; everything not fetched stays as sample values.
export function mergeActivity(sample: Activity, real: ActivityDay): Activity {
  const week = sample.week.map((d) => ({ ...d }));
  if (week.length >= 2) {
    week[week.length - 1].steps = real.stepsToday;
    week[week.length - 2].steps = real.stepsYesterday;
  }
  return {
    ...sample,
    sample: false,
    source: "Google Health",
    lastSync: new Date().toISOString(),
    today: { ...sample.today, steps: real.stepsToday, activeMinutes: real.activeMinutesToday ?? sample.today.activeMinutes },
    yesterday: { ...sample.yesterday, steps: real.stepsYesterday },
    week,
  };
}

// Cookie flags: Secure everywhere except plain-http localhost.
export const cookieFlags = (origin: string) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: !origin.startsWith("http://localhost") && !origin.startsWith("http://127.0.0.1"),
  path: "/",
});
