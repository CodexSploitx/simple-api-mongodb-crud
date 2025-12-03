"use client";
import { useEffect, useState } from "react";

export default function STMPConfiguration() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [corsEnabled, setCorsEnabled] = useState(false);
  const [error, setError] = useState("");
  const [corsOrigins, setCorsOrigins] = useState<string[]>([]);
  const [newOrigin, setNewOrigin] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

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
        const arr = Array.isArray(j?.data?.cors_allowed_origins) ? j.data.cors_allowed_origins : [];
        setCorsOrigins(arr);
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

  const saveCorsOrigins = async (arr: string[]) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth-client/admin/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cors_allowed_origins: arr }),
      });
      const j = await res.json();
      if (!res.ok || j?.success !== true) {
        setError("Error saving allowed origins");
        return false;
      }
      return true;
    } catch {
      setError("Error saving allowed origins");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const addOrigin = async () => {
    const url = newOrigin.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError("Invalid origin. Use http(s)://...");
      return;
    }
    if (corsOrigins.includes(url)) {
      setError("Origin already exists");
      return;
    }
    const next = [...corsOrigins, url];
    const ok = await saveCorsOrigins(next);
    if (ok) {
      setCorsOrigins(next);
      setNewOrigin("");
    }
  };

  const removeOrigin = async (idx: number) => {
    const next = corsOrigins.filter((_, i) => i !== idx);
    const ok = await saveCorsOrigins(next);
    if (ok) setCorsOrigins(next);
  };

  const startEdit = (idx: number) => {
    setEditIndex(idx);
    setEditValue(corsOrigins[idx] || "");
  };

  const cancelEdit = () => {
    setEditIndex(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (editIndex === null) return;
    const val = editValue.trim();
    if (!/^https?:\/\//i.test(val)) {
      setError("Invalid origin. Use http(s)://...");
      return;
    }
    const next = corsOrigins.map((v, i) => (i === editIndex ? val : v));
    const ok = await saveCorsOrigins(next);
    if (ok) {
      setCorsOrigins(next);
      cancelEdit();
    }
  };

  return (
    <div>
      <div className="text-sm font-semibold text-[var(--text)] mb-2">CORS</div>
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
      <div className="mt-2">
        <div className="text-xs text-[var(--text-muted)] mb-1">Allowed origin</div>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 text-sm px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
            value={newOrigin}
            onChange={(e) => setNewOrigin(e.target.value)}
            placeholder="http://localhost:3000"
          />
          <button
            className={`px-3 py-1 rounded text-sm ${loading ? "opacity-50 cursor-not-allowed" : "bg-[var(--accent)] text-white"}`}
            onClick={addOrigin}
            disabled={loading}
          >
            Add
          </button>
        </div>
        <div className="space-y-2">
          {corsOrigins.map((origin, idx) => (
            <div key={`${origin}-${idx}`} className="flex items-center gap-2">
              {editIndex === idx ? (
                <>
                  <input
                    className="flex-1 text-sm px-2 py-1 rounded border border-[var(--border)] bg-[var(--bg)] text-[var(--text)]"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  <button
                    className={`px-3 py-1 rounded text-sm ${loading ? "opacity-50 cursor-not-allowed" : "bg-[var(--accent)] text-white"}`}
                    onClick={saveEdit}
                    disabled={loading}
                  >
                    Save
                  </button>
                  <button
                    className={`px-3 py-1 rounded text-sm bg-[var(--border)] text-[var(--text)]`}
                    onClick={cancelEdit}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 text-sm text-[var(--text)]">{origin}</div>
                  <button
                    className={`px-3 py-1 rounded text-sm bg-[var(--border)] text-[var(--text)]`}
                    onClick={() => startEdit(idx)}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button
                    className={`px-3 py-1 rounded text-sm bg-red-500 text-white`}
                    onClick={() => removeOrigin(idx)}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
          {corsOrigins.length === 0 && (
            <div className="text-xs text-[var(--text-muted)]">No origins configured</div>
          )}
        </div>
      </div>
      {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
    </div>
  );
}
