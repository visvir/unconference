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
  { id: "sideon", label: "Wrong angle", src: "/samples/sideon.mp4" },
  { id: "valgus", label: "Knee caves in", src: "/samples/valgus.mp4" },
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
    const n = s === null ? NaN : Number(s);
    currentRom = Number.isFinite(n) ? n : null;
  } catch {
    currentRom = null;
  }
  return currentRom;
}

export const ROM_SAMPLE = { id: "sample", label: "Sample photo", src: "/samples/rom-sample.jpg" };
