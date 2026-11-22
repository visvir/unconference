"use client";

import { useSyncExternalStore } from "react";
import { loadAudit } from "@/lib/flow";
import { mailtoLink, progressSummary, waLink } from "@/lib/summary";
import type { PatientData } from "@/lib/types";

const EMAIL_KEY = "acl-physio-email";
const WA_KEY = "acl-physio-wa";

// localStorage as an external store: no effect, no hydration mismatch (server snapshot is "").
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const read = (key: string) => () => {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};
const write = (key: string, v: string) => {
  try {
    localStorage.setItem(key, v);
  } catch {}
  listeners.forEach((l) => l());
};
const noop = () => () => {};
const readEmail = read(EMAIL_KEY);
const readWa = read(WA_KEY);

export default function ShareProgress({ patient }: { patient: PatientData }) {
  const audit = useSyncExternalStore(noop, loadAudit, () => null);
  const email = useSyncExternalStore(subscribe, readEmail, () => "");
  const wa = useSyncExternalStore(subscribe, readWa, () => "");
  const message = progressSummary(patient, audit);
  const q = encodeURIComponent(message);
  const mailto = mailtoLink(email, `ACL rehab update: week ${patient.profile.weeksPostOp}`, message);
  // A number typed on this device wins; otherwise the server redirects to a dummy demo number.
  const waHref = wa.replace(/\D/g, "").length >= 10 ? waLink(wa, message) : `/api/share/whatsapp?text=${q}`;
  const field = "mt-1 block min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base text-stone-900";
  const btn = "flex min-h-12 flex-1 items-center justify-center rounded-xl px-4 py-3 text-center text-base font-semibold";

  return (
    <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-800">Share with my physio</h2>
      <p className="mt-2 whitespace-pre-line rounded-xl bg-stone-50 p-3 text-sm text-stone-700">{message}</p>
      <label className="mt-3 block text-xs font-medium text-stone-600">
        Physio&apos;s email
        <input type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => write(EMAIL_KEY, e.target.value)} className={field} />
      </label>
      <label className="mt-3 block text-xs font-medium text-stone-600">
        Physio&apos;s WhatsApp number (optional: leave empty for the dummy demo number)
        <input type="tel" inputMode="tel" autoComplete="off" placeholder="+91…" value={wa} onChange={(e) => write(WA_KEY, e.target.value)} className={field} />
      </label>
      <p className="mt-1 text-xs text-stone-500">Saved on this device only</p>
      <div className="mt-3 flex flex-col gap-2 min-[360px]:flex-row">
        <a href={mailto} className={`${btn} bg-teal-700 text-white active:bg-teal-800`}>
          ✉️ Email my physio
        </a>
        <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${btn} bg-emerald-600 text-white active:bg-emerald-700`}>
          WhatsApp
        </a>
      </div>
      <p className="mt-2 text-xs text-stone-500">Nothing is sent by this app. You press send in your own mail app or WhatsApp.</p>
    </section>
  );
}
