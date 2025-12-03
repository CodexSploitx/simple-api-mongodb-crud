"use client";

import React, { useEffect, useState } from "react";

export default function STMPOtp() {
  const [requireEmailVerificationLogin, setRequireEmailVerificationLogin] = useState<boolean>(false);
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState<number>(60);
  const [otpMaxPerHour, setOtpMaxPerHour] = useState<number>(5);
  const [otpMaxAttempts, setOtpMaxAttempts] = useState<number>(5);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");

  const load = async () => {
    setLoading(true); setError(""); setInfo("");
    try {
      const r = await fetch("/api/stmp/settings", { credentials: "include" });
      const j = await r.json();
      if (j?.success) {
        setRequireEmailVerificationLogin(Boolean(j.settings?.requireEmailVerificationLogin));
        setOtpCooldownSeconds(Number(j.settings?.otpCooldownSeconds || 60));
        setOtpMaxPerHour(Number(j.settings?.otpMaxPerHour || 5));
        setOtpMaxAttempts(Number(j.settings?.otpMaxAttempts || 5));
      } else {
        setError(j?.error || "Failed to load settings");
      }
    } catch {
      setError("Failed to load settings");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveAll = async () => {
    setSaving(true); setError(""); setInfo("");
    try {
      const r = await fetch("/api/stmp/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireEmailVerificationLogin, otpCooldownSeconds, otpMaxPerHour, otpMaxAttempts }),
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
      <div className="text-sm font-semibold text-[var(--text)] mb-2">OTP</div>
      {error && <div className="mb-2 text-xs text-red-500">{error}</div>}
      {info && <div className="mb-2 text-xs text-green-600">{info}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text)]">Require email verification to login</div>
              <div className="text-xs text-[var(--text-muted)]">If enabled, users must verify OTP before sign-in.</div>
            </div>
            <button
              aria-label={requireEmailVerificationLogin ? "Enabled" : "Disabled"}
              disabled={saving || loading}
              onClick={() => setRequireEmailVerificationLogin(!requireEmailVerificationLogin)}
              className={`ml-3 w-10 h-5 rounded-full relative ${requireEmailVerificationLogin ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'}`}
            >
              <span className={`absolute top-0.5 ${requireEmailVerificationLogin ? 'left-5' : 'left-0.5'} w-4 h-4 rounded-full bg-white transition-all`} />
            </button>
          </div>
        </div>
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="text-sm text-[var(--text)] mb-2">OTP cooldown (seconds)</div>
          <input type="number" min={0} max={3600} value={otpCooldownSeconds} onChange={(e)=>setOtpCooldownSeconds(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-[var(--border)] bg-[var(--input)] text-[var(--text)]" />
          <div className="text-xs text-[var(--text-muted)] mt-1">Minimum time between OTP emissions per user.</div>
        </div>
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="text-sm text-[var(--text)] mb-2">OTP max per hour</div>
          <input type="number" min={0} max={100} value={otpMaxPerHour} onChange={(e)=>setOtpMaxPerHour(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-[var(--border)] bg-[var(--input)] text-[var(--text)]" />
          <div className="text-xs text-[var(--text-muted)] mt-1">Maximum OTP emissions per user per hour.</div>
        </div>
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="text-sm text-[var(--text)] mb-2">OTP max attempts</div>
          <input type="number" min={1} max={20} value={otpMaxAttempts} onChange={(e)=>setOtpMaxAttempts(Number(e.target.value))} className="w-full px-2 py-1 rounded border border-[var(--border)] bg-[var(--input)] text-[var(--text)]" />
          <div className="text-xs text-[var(--text-muted)] mt-1">Maximum verification attempts before invalidation.</div>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button disabled={saving || loading} onClick={saveAll} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--on-primary)]">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

