"use client";

import { parseRom } from "./rom";
import type { PhysioNotes } from "./notes";
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

export function clearAudit() {
  current = null;
  try {
    sessionStorage.removeItem(KEY);
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
  { id: "sideon", label: "Wrong angle", src: "/samples/sideon.mp4" },
  { id: "reference", label: "Clean squat", src: "/samples/reference.mp4" },
];

// Knee-bend estimate from a photo ("Today" point on the chart).
const ROM_KEY = "acl-flow-rom";
let currentRom: number | null | undefined;

export function saveRom(deg: number) {
  currentRom = deg;
  try {
    sessionStorage.setItem(ROM_KEY, String(deg));
  } catch {}
}

export function loadRom(): number | null {
  if (currentRom !== undefined) return currentRom;
  try {
    const s = sessionStorage.getItem(ROM_KEY);
    currentRom = parseRom(s);
  } catch {
    currentRom = null;
  }
  return currentRom;
}

export const ROM_SAMPLE = { id: "sample", label: "Sample photo", src: "/samples/rom-sample.jpg" };

// Physio's note, already read and structured. Applied to the plan on the check-in screen.
const NOTES_KEY = "acl-flow-notes";
let currentNotes: PhysioNotes | null | undefined;

export function saveNotes(n: PhysioNotes) {
  currentNotes = n;
  try {
    sessionStorage.setItem(NOTES_KEY, JSON.stringify(n));
  } catch {}
}

export function clearNotes() {
  currentNotes = null;
  try {
    sessionStorage.removeItem(NOTES_KEY);
  } catch {}
}

export function loadNotes(): PhysioNotes | null {
  if (currentNotes !== undefined) return currentNotes;
  try {
    const s = sessionStorage.getItem(NOTES_KEY);
    currentNotes = s ? (JSON.parse(s) as PhysioNotes) : null;
  } catch {
    currentNotes = null;
  }
  return currentNotes;
}
