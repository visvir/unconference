import activityJson from "../data/activity.json" with { type: "json" };

// Sample wearable data (no real integration): seeded JSON standing in for a Google Health-style daily summary.
export type DayStats = { steps: number; activeMinutes: number; restingHr: number; sleepHours: number };
export type Activity = {
  source: string;
  sample: boolean;
  lastSync: string;
  today: DayStats;
  yesterday: DayStats;
  stepsGoal: number;
  week: { day: string; steps: number }[];
};

export const activity: Activity = activityJson;

const fmt = (n: number) => n.toLocaleString("en-IN");

// Fixed rule, no AI: a day at 1.4x the step goal or more counts as extra load on the knee.
export function activityInsight(a: Activity): { tone: "neutral" | "watch"; text: string } {
  if (a.yesterday.steps >= 1.4 * a.stepsGoal) {
    return {
      tone: "watch",
      text: `Yesterday was a big day on your feet (${fmt(a.yesterday.steps)} steps). That counts as extra load on the knee, so go by how it feels today.`,
    };
  }
  return { tone: "neutral", text: "Daily activity is within your usual range." };
}

export function activityLine(a: Activity): string {
  return `Activity yesterday: ${fmt(a.yesterday.steps)} steps, ${a.yesterday.activeMinutes} active min (${a.source}, sample data).`;
}
