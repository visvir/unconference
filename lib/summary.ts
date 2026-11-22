import type { FindingType, PatientData, Phase, SquatAudit } from "./types.ts";

const NAMES: Record<FindingType, string> = {
  knee_valgus: "knee caving inward",
  trunk_lean: "weight shift",
  pelvic_drop: "hip tilt",
};

export function currentPhase(p: PatientData): Phase | undefined {
  const w = p.profile.weeksPostOp;
  return p.phases?.find((ph) => ph.fromWeek <= w && w < ph.toWeek);
}

// Plain-text update a patient can send their physio. Pure and deterministic: every number comes from the data.
export function progressSummary(p: PatientData, audit: SquatAudit | null): string {
  const { profile, sessions, week } = p;
  const first = sessions[0];
  const last = sessions[sessions.length - 1];
  const lines: string[] = [
    `ACL rehab update: ${profile.name}, week ${profile.weeksPostOp} after ACL reconstruction (${profile.graft} graft, ${profile.surgicalLeg} knee).`,
  ];
  if (last) {
    let bend = `Knee bend: ${last.flexionDeg}°`;
    if (first && first !== last) {
      const gain = last.flexionDeg - first.flexionDeg;
      const days = (Date.parse(last.date) - Date.parse(first.date)) / 86400000;
      const weeks = Math.max(1, Math.round(days / 7));
      bend += ` (${gain >= 0 ? "up" : "down"} ${Math.abs(gain)}° in ${weeks} week${weeks === 1 ? "" : "s"})`;
    }
    const ext = last.extensionDeg === 0 ? "full" : `lacking ${last.extensionDeg}°`;
    lines.push(`${bend}. Straightening: ${ext}. Pain yesterday: ${last.pain}/10.`);
  }
  if (week) {
    const missed = week.missed.length ? ` (missed ${week.missed.join(", ")})` : "";
    lines.push(`This week: ${week.done} of ${week.planned} sessions done${missed}.`);
  }
  if (last?.note) lines.push(`Yesterday: ${last.note}`);
  if (audit?.video_usable) {
    const hits = audit.findings.filter((f) => f.severity > 0).map((f) => `${NAMES[f.type]} ${f.severity}/3`);
    lines.push(`Form check today: ${hits.length ? hits.join(", ") : "no issues seen"}.`);
  }
  lines.push("Sent from ACL Co-pilot. Observations to discuss, not a diagnosis.");
  return lines.join("\n");
}

// WhatsApp deep link. On a phone it opens the WhatsApp app, on a laptop WhatsApp Web, with the chat and text ready.
// A 10-digit number is treated as Indian (+91); with no number WhatsApp shows its contact picker.
export function waLink(number: string, message: string): string {
  // A "+" means the country code is already there.
  const plus = number.trim().startsWith("+");
  let d = number.replace(/\D/g, "");
  if (!plus) {
    d = d.replace(/^0+/, "");
    if (d.length === 10) d = `91${d}`;
  }
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

// mailto link. Anything after the first ? & # or whitespace in the address is dropped (header injection).
export function mailtoLink(email: string, subject: string, body: string): string {
  const addr = email.trim().split(/[?&#\s]/)[0];
  return `mailto:${encodeURIComponent(addr).replace(/%40/g, "@")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// Gmail's compose window in the browser, with the draft filled in. Works wherever the user is signed in to Gmail,
// unlike mailto:, which needs a default mail app configured on the computer.
export function gmailLink(email: string, subject: string, body: string): string {
  const addr = email.trim().split(/[?&#\s]/)[0];
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(addr)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
