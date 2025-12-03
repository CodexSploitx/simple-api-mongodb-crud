"use client";

import React, { useEffect, useState } from "react";

export default function STMInvite() {
  const [inviteCooldownSeconds, setInviteCooldownSeconds] = useState<number>(60);
  const [inviteMaxPerHour, setInviteMaxPerHour] = useState<number>(10);
  const [inviteTokenTtlHours, setInviteTokenTtlHours] = useState<number>(168);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const load = async () => {
    setLoading(true); setError(""); setInfo("");
    try {
      const r = await fetch("/api/stmp/settings", { credentials: "include" });
      const j = await r.json();
      if (j?.success) {
        setInviteCooldownSeconds(Number(j.settings?.inviteCooldownSeconds || 60));
        setInviteMaxPerHour(Number(j.settings?.inviteMaxPerHour || 10));
        setInviteTokenTtlHours(Number(j.settings?.inviteTokenTtlHours || 168));
      } else {
        setError(j?.error || "Failed to load settings");
      }
    } catch {
      setError("Failed to load settings");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setError(""); setInfo("");
    try {
      const r = await fetch("/api/stmp/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requireEmailVerificationLogin: true,
          // keep current otp settings implicitly on server defaults
          inviteCooldownSeconds,
          inviteMaxPerHour,
          inviteTokenTtlHours,
        }),
      });
      const j = await r.json();
      if (j?.success) {
        setInfo("Settings saved");
      } else {
        setError(j?.error || "Failed to save settings");
      }
    } catch {
      setError("Failed to save settings");
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="text-sm font-semibold text-[var(--text)] mb-2">Invite</div>
      {error && <div className="mb-2 text-xs text-red-500">{error}</div>}
      {info && <div className="mb-2 text-xs text-green-600">{info}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="text-sm text-[var(--text)] mb-2">Invite cooldown (seconds)</div>
          <input type="number" min={0} max={3600} value={inviteCooldownSeconds} onChange={(e)=>setInviteCooldownSeconds(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-[var(--border)] bg-[var(--input)] text-[var(--text)]" />
          <div className="text-xs text-[var(--text-muted)] mt-1">Minimum time between invites per user.</div>
        </div>
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="text-sm text-[var(--text)] mb-2">Invite max per hour</div>
          <input type="number" min={0} max={100} value={inviteMaxPerHour} onChange={(e)=>setInviteMaxPerHour(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-[var(--border)] bg-[var(--input)] text-[var(--text)]" />
          <div className="text-xs text-[var(--text-muted)] mt-1">Maximum invites per user per hour.</div>
        </div>
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="text-sm text-[var(--text)] mb-2">Invite token TTL (hours)</div>
          <input type="number" min={1} max={720} value={inviteTokenTtlHours} onChange={(e)=>setInviteTokenTtlHours(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-[var(--border)] bg-[var(--input)] text-[var(--text)]" />
          <div className="text-xs text-[var(--text-muted)] mt-1">Expiration time for invite links.</div>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button disabled={saving || loading} onClick={save} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--on-primary)]">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

