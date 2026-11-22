export type Graft = "hamstring" | "patellar" | "quadriceps" | "allograft";

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  language: string;
  surgicalLeg: "left" | "right";
  graft: Graft;
  meniscusRepair: boolean;
  surgeryDate: string; // ISO date
  weeksPostOp: number;
  surgeon: { name: string; hospital: string; whatsapp: string };
  physio: { name: string };
}

export type Swelling = "less" | "same" | "more";

export interface Session {
  date: string; // ISO date
  flexionDeg: number; // knee bend, higher is better
  extensionDeg: number; // 0 = full straight, positive = lacking extension
  pain: number; // 0–10
  swelling: Swelling;
  exercises: string[];
  loadIncreased: boolean;
  note?: string;
}

export interface Exercise {
  id: string;
  name: string;
  dose: string;
  kind: "loading" | "protective" | "recovery";
  minutes?: number;
  priority?: number; // lower = more important when time is short
}

export interface Phase {
  id: string;
  label: string;
  weeks: string;
  fromWeek: number;
  toWeek: number;
  goals: string[];
}

export interface PatientData {
  profile: PatientProfile;
  sessions: Session[];
  todayPlan: Exercise[];
  week?: { planned: number; done: number; missed: string[] };
  phases?: Phase[];
}

export interface CheckIn {
  text: string;
  swelling: Swelling;
}

export type FindingType = "knee_valgus" | "trunk_lean" | "pelvic_drop";

export interface Finding {
  type: FindingType;
  severity: 0 | 1 | 2 | 3;
  timestampSec: number;
  observation: string;
  cues: [string, string];
}

export interface SquatAudit {
  video_usable: boolean;
  unusable_reason?: string;
  findings: Finding[];
  summary: string;
}

export interface RedFlagResult {
  hit: boolean;
  matched: string[]; // human labels, e.g. "calf pain or swelling (possible DVT)"
}

export interface DailyPlan {
  decision: "deload" | "proceed";
  reasons: string[]; // deterministic, why the rule fired
  exercises: Exercise[];
  removed: Exercise[];
  explanation?: string; // model-written, patient's language
}
