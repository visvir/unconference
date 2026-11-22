"use client";

import Link from "next/link";
import { useState } from "react";

// Owner-only: turns on live (paid) analysis for this browser for 12 hours.
export default function UnlockPage() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "on" | "off" | "wrong">("idle");

  async function call(method: "POST" | "DELETE") {
    setState("busy");
    try {
      const res = await fetch("/api/unlock", {
        method,
        headers: { "Content-Type": "application/json" },
        body: method === "POST" ? JSON.stringify({ code }) : undefined,
      });
      setState(method === "DELETE" ? "off" : res.ok ? "on" : "wrong");
      if (res.ok) setCode("");
    } catch {
      setState("wrong");
    }
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <Link href="/" className="backlink">← Home</Link>
      <p className="eyebrow mt-2 text-mute">Owner</p>
      <h1 className="h-display text-3xl">Unlock live analysis</h1>
      <p className="mt-2 text-sm text-mute">
        The public demo replays saved responses for the samples. Uploads, voice and pasted notes use paid AI calls, so
        they are locked unless you enter the owner passcode. It stays on in this browser for 12 hours.
      </p>
      <form
        className="card mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (code) call("POST");
        }}
      >
        <label className="block text-xs font-semibold text-ink">
          Passcode
          <input type="password" autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} className="field mt-1" />
        </label>
        <button type="submit" disabled={!code || state === "busy"} className="btn btn-primary mt-3 w-full">
          Unlock
        </button>
        <button type="button" onClick={() => call("DELETE")} className="btn btn-secondary mt-2 w-full">
          Lock again
        </button>
        {state === "on" && <p className="chip chip-good mt-3">Live analysis is on in this browser</p>}
        {state === "off" && <p className="chip chip-ink mt-3">Locked</p>}
        {state === "wrong" && <p className="mt-3 text-sm text-red-800">That passcode isn&apos;t right.</p>}
      </form>
    </main>
  );
}
