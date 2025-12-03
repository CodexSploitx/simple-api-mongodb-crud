"use client";

import React, { useEffect, useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SMTPSettingsModal({ isOpen, onClose }: Props) {
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState<number>(587);
  const [minIntervalSeconds, setMinIntervalSeconds] = useState<number>(60);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [credentialsSet, setCredentialsSet] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setError("");
      try {
        const r = await fetch("/api/stpm/config", { credentials: "include" });
        const j = await r.json();
        if (j?.success && j?.data) {
          setSenderEmail(j.data.senderEmail || "");
          setSenderName(j.data.senderName || "");
          setHost(j.data.host || "");
          setPort(Number(j.data.port || 587));
          setMinIntervalSeconds(Number(j.data.minIntervalSeconds || 60));
          setCredentialsSet(Boolean(j.data.credentialsSet));
        }
      } catch {}
    };
    load();
  }, [isOpen]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        senderEmail,
        senderName,
        host,
        port,
        minIntervalSeconds,
      };
      if (username.trim().length > 0) payload.username = username.trim();
      if (password.trim().length > 0) payload.password = password.trim();
      const r = await fetch("/api/stpm/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j?.success) {
        setSaved(true);
        setCredentialsSet(credentialsSet || password.trim().length > 0 || username.trim().length > 0);
        setPassword("");
        setUsername("");
      } else {
        setError(j?.error || "Error al guardar configuración");
      }
    } catch  {
      setError("Error de red");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 w-full max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">SMTP Settings</h3>
          <button className="text-sm text-[var(--text-muted)]" onClick={onClose}>Cerrar</button>
        </div>
        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
        {saved && <div className="mb-4 text-sm text-green-600">Configuración guardada</div>}
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Sender email address</label>
              <input value={senderEmail} onChange={(e)=>setSenderEmail(e.target.value)} type="email" placeholder="no_reply@youstudenty.com" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Sender name</label>
              <input value={senderName} onChange={(e)=>setSenderName(e.target.value)} type="text" placeholder="YouStudenty" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Host</label>
              <input value={host} onChange={(e)=>setHost(e.target.value)} type="text" placeholder="in-v3.mailjet.com" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Port</label>
              <input value={port} onChange={(e)=>setPort(Number(e.target.value)||0)} type="number" placeholder="587" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Minimum interval per user (seconds)</label>
              <input value={minIntervalSeconds} onChange={(e)=>setMinIntervalSeconds(Number(e.target.value)||0)} type="number" placeholder="60" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Username</label>
              <input value={username} onChange={(e)=>setUsername(e.target.value)} type="text" placeholder="8bdef92b988283d9d51f9c96a6024d68" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Password</label>
              <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="••••••••" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)]">
            {credentialsSet ? "Credenciales guardadas encriptadas" : "No hay credenciales guardadas"}
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">Cancelar</button>
            <button disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--on-primary)]">{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

