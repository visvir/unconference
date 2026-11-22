"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Session } from "@/lib/types";

export default function RomChart({ sessions }: { sessions: Session[] }) {
  const data = sessions.map((s) => ({
    date: new Date(s.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" }),
    flexion: s.flexionDeg,
  }));
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#e7e5e4" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[95, 135]} tick={{ fontSize: 11, fill: "#78716c" }} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => [`${v}°`, "Flexion"]} />
          <Line type="monotone" dataKey="flexion" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
