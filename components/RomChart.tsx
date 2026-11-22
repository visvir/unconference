"use client";

import { useSyncExternalStore } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { loadRom } from "@/lib/flow";
import type { Session } from "@/lib/types";

type Pt = { date: string; flexion: number; today?: boolean };

function Dot(props: { cx?: number; cy?: number; payload?: Pt }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined) return null;
  const today = payload?.today;
  return <circle cx={cx} cy={cy} r={today ? 5 : 3} fill={today ? "#ff5a36" : "#0f1115"} stroke="none" />;
}

export default function RomChart({ sessions }: { sessions: Session[] }) {
  const today = useSyncExternalStore(() => () => {}, loadRom, () => null);
  const data: Pt[] = sessions.map((s) => ({
    date: new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }),
    flexion: s.flexionDeg,
  }));
  if (today !== null) data.push({ date: "Today", flexion: today, today: true });
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#eceae4" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b6f7a" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[(min: number) => Math.min(95, Math.floor(min / 5) * 5), (max: number) => Math.max(135, Math.ceil(max / 5) * 5)]}
            tick={{ fontSize: 11, fill: "#6b6f7a" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip formatter={(v) => [`${v}°`, "Flexion"]} />
          <Line type="monotone" dataKey="flexion" stroke="#0f1115" strokeWidth={2.5} dot={<Dot />} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
