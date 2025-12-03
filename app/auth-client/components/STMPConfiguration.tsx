"use client";
import { useEffect, useState } from "react";

export default function STMPConfiguration() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [corsEnabled, setCorsEnabled] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    fetch("/api/auth-client/admin/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        const v = Boolean(j?.data?.relacionaldb_auth_client === true);
        setEnabled(v);
        const c = Boolean(j?.data?.cors_enabled === true);
        setCorsEnabled(c);
      })
      .catch(() => {
        if (!mounted) return;
        setError("Error loading settings");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = async () => {
    setLoading(true);
    setError("");
    const next = !enabled;
    try {
      const res = await fetch("/api/auth-client/admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relacionaldb_auth_client: next }),
      });
      const j = await res.json();
      if (!res.ok || j?.success !== true) {
        setError("Error updating setting");
        return;
      }
      setEnabled(next);
    } catch {
      setError("Error updating setting");
    } finally {
      setLoading(false);
    }
  };

  const toggleCors = async () => {
    setLoading(true);
    setError("");
    const next = !corsEnabled;
    try {
      const res = await fetch("/api/auth-client/admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cors_enabled: next }),
      });
      const j = await res.json();
      if (!res.ok || j?.success !== true) {
        setError("Error updating CORS setting");
        return;
      }
      setCorsEnabled(next);
    } catch {
      setError("Error updating CORS setting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="text-sm font-semibold text-[var(--text)] mb-2">Configuration</div>
      <div className="flex items-center justify-between py-2">
        <div>
          <div className="text-sm text-[var(--text)]">Auth Client access to CRUD (RLS)</div>
          <div className="text-xs text-[var(--text-muted)]">Enable using Auth-Client access tokens in CRUD endpoints under ownerId rules.</div>
        </div>
        <button
          className={`w-12 h-6 rounded-full transition ${enabled ? "bg-[var(--accent)]" : "bg-[var(--border)]"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={toggle}
          disabled={loading}
          aria-pressed={enabled}
        >
          <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition ${enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
      <div className="flex items-center justify-between py-2 mt-2">
        <div>
          <div className="text-sm text-[var(--text)]">Enforce CORS whitelist</div>
          <div className="text-xs text-[var(--text-muted)]">Restrict responses to allowed origins and add Vary: Origin.</div>
        </div>
        <button
          className={`w-12 h-6 rounded-full transition ${corsEnabled ? "bg-[var(--accent)]" : "bg-[var(--border)]"} ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={toggleCors}
          disabled={loading}
          aria-pressed={corsEnabled}
        >
          <span className={`block w-5 h-5 bg-white rounded-full shadow transform transition ${corsEnabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}
