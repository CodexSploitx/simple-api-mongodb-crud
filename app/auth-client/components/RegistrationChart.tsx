"use client";

import React, { useMemo } from "react";
import type { UserRecord } from "../types";

type Props = {
  users: UserRecord[];
  range?: "1d" | "7d" | "30d" | "180d";
  headerRight?: React.ReactNode;
};

export default function RegistrationChart({ users, range = "7d", headerRight }: Props) {
  const series = useMemo(() => {
    if (range === "1d") {
      const today = new Date();
      const dayKey = today.toISOString().slice(0, 10);
      const hours = Array.from({ length: 24 }, (_, h) => h);
      const buckets: Record<number, number> = Object.fromEntries(hours.map((h) => [h, 0]));
      users.forEach((u) => {
        const d = new Date(u.createdAt as unknown as string);
        if (isNaN(d.getTime())) return;
        const key = d.toISOString().slice(0, 10);
        if (key !== dayKey) return;
        buckets[d.getHours()] = (buckets[d.getHours()] || 0) + 1;
      });
      const labels = hours.map((h) => String(h).padStart(2, "0"));
      const values = hours.map((h) => buckets[h] || 0);
      const max = Math.max(1, ...values);
      return { labels, values, max, unit: "h" } as const;
    }

    const days = range === "7d" ? 7 : range === "30d" ? 30 : 180;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - (days - 1));

    const buckets: { [key: string]: number } = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      buckets[key] = 0;
    }

    users.forEach((u) => {
      const created = new Date(u.createdAt as unknown as string);
      if (isNaN(created.getTime())) return;
      created.setHours(0, 0, 0, 0);
      const key = created.toISOString().slice(0, 10);
      if (key in buckets) buckets[key] += 1;
    });

    const labels: string[] = [];
    const values: number[] = [];
    Object.keys(buckets)
      .sort()
      .forEach((k) => {
        labels.push(k.slice(5));
        values.push(buckets[k]);
      });
    const max = Math.max(1, ...values);
    return { labels, values, max, unit: "d" } as const;
  }, [users, range]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Registrations ({range === "1d" ? "last 24h" : range === "7d" ? "last 7d" : range === "30d" ? "last 30d" : "last 180d"})
        </h3>
        <div className="flex items-center gap-2">
          {headerRight}
          <div className="text-xs text-[var(--text-muted)]">Peak: {Math.max(...series.values)}</div>
        </div>
      </div>
      <div className="h-36 flex items-end gap-1">
        {series.values.map((v, i) => {
          const heightPct = Math.round((v / series.max) * 100);
          return (
            <div key={i} className="flex flex-col items-center" style={{ width: `${100 / series.values.length}%` }}>
              <div className="w-full rounded-t-sm bg-[var(--accent)] hover:bg-[var(--accent-hover)]" style={{ height: `${heightPct}%` }} title={`${series.labels[i]}: ${v}`} />
              <div className="mt-1 text-[10px] text-[var(--text-muted)]">{series.labels[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
