"use client";

import { useEffect, useState } from "react";

const fmt = (n: number) => n.toLocaleString("en-IN");
type Live = { today: number; yesterday: number; active?: number };
type State =
  | { kind: "off" }
  | { kind: "disconnected" }
  | { kind: "loading" }
  | { kind: "live"; live: Live }
  | { kind: "error"; message: string };

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Optional live strip for the Activity card. Renders nothing unless the server has the Google Health env vars
// (production doesn't), so the sample widget stays exactly as it is.
export default function ActivityLive() {
  const [state, setState] = useState<State>({ kind: "off" });

  useEffect(() => {
    let alive = true;
    (async () => {
      const s = (await fetch("/api/health/status", { cache: "no-store" }).then((r) => r.json()).catch(() => null)) as
        | { enabled?: boolean; connected?: boolean }
        | null;
      if (!alive || !s?.enabled) return;
      if (!s.connected) return setState({ kind: "disconnected" });
      setState({ kind: "loading" });
      const res = await fetch(`/api/health/data?date=${localDate()}`, { cache: "no-store" }).catch(() => null);
      const j = res ? await res.json().catch(() => null) : null;
      if (!alive) return;
      if (res?.status === 401) return setState({ kind: "disconnected" });
      const a = j?.activity;
      if (!res?.ok || !a) return setState({ kind: "error", message: j?.error ?? "Couldn't load Google Health right now." });
      setState({ kind: "live", live: { today: a.today.steps, yesterday: a.yesterday.steps, active: a.today.activeMinutes } });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const disconnect = async () => {
    await fetch("/api/health/disconnect", { method: "POST" }).catch(() => null);
    setState({ kind: "disconnected" });
  };

  if (state.kind === "off") return null;

  return (
    <div className="mt-3 border-t border-black/5 pt-3">
      {state.kind === "disconnected" && (
        <>
          <a href="/api/health/connect" className="btn btn-quiet">Connect Google Health</a>
          <p className="note mt-1.5">Read-only. Your data stays in this browser session.</p>
        </>
      )}
      {state.kind === "loading" && <p className="note">Loading Google Health…</p>}
      {state.kind === "error" && <p className="note">{state.message}</p>}
      {state.kind === "live" && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="chip chip-ink">Google Health · Live</span>
            <button type="button" onClick={disconnect} className="link text-xs">Disconnect</button>
          </div>
          <p className="mt-2 text-sm text-ink">
            <span className="stat-num">{fmt(state.live.today)}</span> steps today ·{" "}
            <span className="stat-num">{fmt(state.live.yesterday)}</span> yesterday
          </p>
          <p className="note mt-1.5">Live numbers here; the stats and chart above are sample data.</p>
        </>
      )}
    </div>
  );
}
