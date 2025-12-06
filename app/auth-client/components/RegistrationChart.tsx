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
      const y = today.getFullYear();
      const m = today.getMonth();
      const d0 = today.getDate();
      const hours = Array.from({ length: 24 }, (_, h) => h);
      const buckets: Record<number, number> = Object.fromEntries(hours.map((h) => [h, 0]));
      users.forEach((u) => {
        const d = new Date(u.createdAt as unknown as string);
        if (isNaN(d.getTime())) return;
        if (d.getFullYear() !== y || d.getMonth() !== m || d.getDate() !== d0) return;
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

    const fmt = (d: Date) => {
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    };

    const buckets: { [key: string]: number } = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = fmt(d);
      buckets[key] = 0;
    }

    users.forEach((u) => {
      const created = new Date(u.createdAt as unknown as string);
      if (isNaN(created.getTime())) return;
      created.setHours(0, 0, 0, 0);
      const key = fmt(created);
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

  const extras = useMemo(() => {
    const inRange = (() => {
      if (range === "1d") {
        const today = new Date();
        const y = today.getFullYear();
        const m = today.getMonth();
        const d0 = today.getDate();
        return users.filter((u) => {
          const d = new Date(u.createdAt as unknown as string);
          return !isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m && d.getDate() === d0;
        });
      }
      const days = range === "7d" ? 7 : range === "30d" ? 30 : 180;
      const end = new Date(); end.setHours(0,0,0,0);
      const start = new Date(end); start.setDate(end.getDate() - (days - 1));
      return users.filter((u) => {
        const d = new Date(u.createdAt as unknown as string);
        if (isNaN(d.getTime())) return false;
        const dd = new Date(d); dd.setHours(0,0,0,0);
        return dd.getTime() >= start.getTime() && dd.getTime() <= end.getTime();
      });
    })();

    const byCountry: Record<string, number> = {};
    users.forEach((u) => {
      const c = String(
        (u as unknown as { registrationMeta?: { ip?: { country?: string }; } }).registrationMeta?.ip?.country ||
        (u as unknown as { registrationMeta?: { ip?: { region?: string }; } }).registrationMeta?.ip?.region ||
        "Unknown"
      ).trim();
      const key = c || "Unknown";
      byCountry[key] = (byCountry[key] || 0) + 1;
    });
    const topCountries = Object.entries(byCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const byDevice: Record<string, number> = {};
    users.forEach((u) => {
      const t = String((u as unknown as { registrationMeta?: { device?: { type?: string } } }).registrationMeta?.device?.type || "unknown");
      const key = t.toLowerCase();
      byDevice[key] = (byDevice[key] || 0) + 1;
    });
    const devices = Object.entries(byDevice).sort((a, b) => b[1] - a[1]);

    const byBrowser: Record<string, number> = {};
    users.forEach((u) => {
      const b = String((u as unknown as { registrationMeta?: { device?: { browser?: string } } }).registrationMeta?.device?.browser || "unknown");
      const key = b.toLowerCase();
      byBrowser[key] = (byBrowser[key] || 0) + 1;
    });
    const browsers = Object.entries(byBrowser).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const verified = users.filter((u) => (u as unknown as { verifiEmail?: boolean }).verifiEmail === true).length;

    return { inRangeCount: inRange.length, topCountries, devices, browsers, verified } as const;
  }, [users, range]);

  const total = users.length;
  const peak = Math.max(...series.values);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text)]">Registrations ({range === "1d" ? "last 24h" : range === "7d" ? "last 7d" : range === "30d" ? "last 30d" : "last 180d"})</h3>
        <div className="flex items-center gap-2">
          {headerRight}
          <div className="text-xs text-[var(--text-muted)]">Peak: {peak}</div>
        </div>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3">
        <div className="flex items-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-md bg-[var(--surface)] px-3 py-2 border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)]">Total</div>
            <div className="text-sm font-semibold text-[var(--text)]">{total}</div>
          </div>
          <div className="rounded-md bg-[var(--surface)] px-3 py-2 border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)]">In range ({range === "1d" ? "today" : range === "7d" ? "last 7d" : range === "30d" ? "last 30d" : "last 180d"})</div>
            <div className="text-sm font-semibold text-[var(--text)]">{extras.inRangeCount}</div>
          </div>
          <div className="rounded-md bg-[var(--surface)] px-3 py-2 border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)]">Verified</div>
            <div className="text-sm font-semibold text-[var(--text)]">{extras.verified}</div>
          </div>
          <div className="rounded-md bg-[var(--surface)] px-3 py-2 border border-[var(--border)]">
            <div className="text-[10px] text-[var(--text-muted)]">Countries</div>
            <div className="text-sm font-semibold text-[var(--text)]">{extras.topCountries.length}</div>
          </div>
          </div>

          <div className="flex-1 min-w-0 overflow-x-auto custom-scrollbar">
            <div className="flex flex-nowrap items-center gap-3 whitespace-nowrap">
            <span className="text-[11px] text-[var(--text-muted)]">Top countries:</span>
            {extras.topCountries.map(([name, count], idx) => (
              <div key={idx} className="inline-flex items-center shrink-0 rounded-md bg-[var(--surface)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--text)]">
                <span className="truncate max-w-[140px]">{name}</span>
                <span className="ml-2 text-[var(--text-muted)]">{count}</span>
              </div>
            ))}
            {extras.topCountries.length === 0 && (
              <div className="text-xs text-[var(--text-muted)]">No data</div>
            )}

            <span className="ml-4 text-[11px] text-[var(--text-muted)]">Devices:</span>
            {extras.devices.map(([k, v], i) => (
              <div key={i} className="inline-flex items-center shrink-0 rounded-md bg-[var(--surface)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--text)] capitalize">
                <span className="truncate max-w-[120px]">{k}</span>
                <span className="ml-2 text-[var(--text-muted)]">{v}</span>
              </div>
            ))}
            {extras.devices.length === 0 && <div className="text-xs text-[var(--text-muted)]">No data</div>}

            <span className="ml-4 text-[11px] text-[var(--text-muted)]">Browsers:</span>
            {extras.browsers.map(([k, v], i) => (
              <div key={i} className="inline-flex items-center shrink-0 rounded-md bg-[var(--surface)] border border-[var(--border)] px-2 py-1 text-xs text-[var(--text)] capitalize">
                <span className="truncate max-w-[140px]">{k}</span>
                <span className="ml-2 text-[var(--text-muted)]">{v}</span>
              </div>
            ))}
            {extras.browsers.length === 0 && <div className="text-xs text-[var(--text-muted)]">No data</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
