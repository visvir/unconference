"use client";

import type { SquatAudit } from "./types";

// Hand-off between screens in one tab. No database, by design.
const KEY = "acl-flow-audit";

// In-memory copy gives useSyncExternalStore a stable snapshot; sessionStorage survives reloads.
let current: SquatAudit | null | undefined;

export function saveAudit(a: SquatAudit) {
  current = a;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {}
}

export function loadAudit(): SquatAudit | null {
  if (current !== undefined) return current;
  try {
    const s = sessionStorage.getItem(KEY);
    current = s ? (JSON.parse(s) as SquatAudit) : null;
  } catch {
    current = null;
  }
  return current;
}

export function isDemo(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("demo") === "1";
}

export const SAMPLES = [
  { id: "sideon", label: "Sample: wrong angle", src: "/samples/sideon.mp4" },
  { id: "reference", label: "Sample: clean squat", src: "/samples/reference.mp4" },
];
