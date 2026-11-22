"use client";

import { useSyncExternalStore } from "react";
import DemoLink from "@/components/DemoLink";
import { loadAudit } from "@/lib/flow";
import { gmailLink, mailtoLink, progressSummary, waLink } from "@/lib/summary";
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

export default function ShareProgress({ patient, compact = false }: { patient: PatientData; compact?: boolean }) {
  const audit = useSyncExternalStore(noop, loadAudit, () => null);
  const email = useSyncExternalStore(subscribe, readEmail, () => "");
  const wa = useSyncExternalStore(subscribe, readWa, () => "");
  const message = progressSummary(patient, audit);
  const q = encodeURIComponent(message);
  const subjectText = `ACL rehab update: week ${patient.profile.weeksPostOp}`;
  const mailto = mailtoLink(email, subjectText, message);
  const gmail = gmailLink(email, subjectText, message);
  // A number typed on this device wins; otherwise the server redirects to a dummy demo number.
  const waHref = wa.replace(/\D/g, "").length >= 10 ? waLink(wa, message) : `/api/share/whatsapp?text=${q}`;
  const field = "field mt-1";
  const btn = "btn flex-1";

  // Landing-page version: just the two buttons. Contacts and the message preview live on My recovery.
  if (compact) {
    return (
      <section className="card-dark mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold text-white">Share my progress with my physio</h2>
          <DemoLink href="/progress" className="inline-flex min-h-11 items-center py-1 text-xs font-semibold text-volt underline">Preview</DemoLink>
        </div>
        <div className="mt-3 flex flex-col gap-2 min-[360px]:flex-row">
          <a href={gmail} target="_blank" rel="noopener noreferrer" className={`${btn} btn-accent`}>
            ✉️ Email
          </a>
          <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${btn} btn-whatsapp`}>
            WhatsApp
          </a>
        </div>
        <p className="mt-2 text-xs text-white/60">Opens a ready draft. You press send.</p>
      </section>
    );
  }

  return (
    <section id="share" className="card mt-4">
      <h2 className="eyebrow text-mute">Share with my physio</h2>
      <p className="mt-2 whitespace-pre-line rounded-2xl bg-paper p-4 text-sm text-ink">{message}</p>
      <label className="mt-3 block text-xs font-semibold text-ink">
        Physio&apos;s email
        <input type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => write(EMAIL_KEY, e.target.value)} className={field} />
      </label>
      <label className="mt-3 block text-xs font-semibold text-ink">
        Physio&apos;s WhatsApp number (optional: leave empty for the dummy demo number)
        <input type="tel" inputMode="tel" autoComplete="off" placeholder="+91…" value={wa} onChange={(e) => write(WA_KEY, e.target.value)} className={field} />
      </label>
      <p className="note mt-1">Saved on this device only</p>
      <div className="mt-3 flex flex-col gap-2 min-[360px]:flex-row">
        <a href={gmail} target="_blank" rel="noopener noreferrer" className={`${btn} btn-primary`}>
          ✉️ Email my physio
        </a>
        <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${btn} btn-whatsapp`}>
          WhatsApp
        </a>
      </div>
      <p className="note mt-2">
        The email button opens a Gmail draft.{" "}
        <a href={mailto} className="link inline-block py-2">Use another mail app</a>
      </p>
      <p className="note mt-1">Nothing is sent by this app. You press send in Gmail or WhatsApp.</p>
    </section>
  );
}
