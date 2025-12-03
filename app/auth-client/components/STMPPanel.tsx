"use client";

import React, { useEffect, useState } from "react";
import SMTPSettingsModal from "./SMTP/SMTPSettingsModal";
import TemplatesModal from "./Templates/TemplatesModal";
import TemplatesList from "./Templates/TemplatesList";
import STMPEvents from "@/app/auth-client/components/STMPEvents";
import STMPConfiguration from "@/app/auth-client/components/STMPConfiguration";
import STMPOtp from "@/app/auth-client/components/STMPOtp";
import STMInvite from "@/app/auth-client/components/STMInvite";

export default function STMPPanel() {
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
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"smtp"|"templates"|"events"|"configuration"|"otp"|"invite">("smtp");
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setError("");
      try {
        const r = await fetch("/api/stmp/config", { credentials: "include" });
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
  }, []);

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
      const r = await fetch("/api/stmp/config", {
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
        setError(j?.error || "Error saving configuration");
      }
    } catch  {
      setError("Error saving configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
      <h2 className="text-lg font-semibold text-[var(--text)] mb-2">SMTP</h2>
      <p className="text-sm text-[var(--text-muted)] mb-4">Configure your SMTP provider to send emails.</p>
      {error && (
        <div className="mb-4 text-sm text-red-500">{error}</div>
      )}
      {saved && (
        <div className="mb-4 text-sm text-green-600">Configuration saved</div>
      )}
      <div className="mt-2">
        <div className="flex gap-4 border-b border-[var(--border)] mb-4">
          <button onClick={()=>setActiveTab("templates")} className={`px-2 py-1 text-sm ${activeTab==='templates' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>Templates</button>
          <button onClick={()=>setActiveTab("smtp")} className={`px-2 py-1 text-sm ${activeTab==='smtp' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>SMTP Settings</button>
          <button onClick={()=>setActiveTab("events")} className={`px-2 py-1 text-sm ${activeTab==='events' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>Events</button>
          <button onClick={()=>setActiveTab("configuration")} className={`px-2 py-1 text-sm ${activeTab==='configuration' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>Configuration</button>
          <button onClick={()=>setActiveTab("otp")} className={`px-2 py-1 text-sm ${activeTab==='otp' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>OTP</button>
          <button onClick={()=>setActiveTab("invite")} className={`px-2 py-1 text-sm ${activeTab==='invite' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>Invite</button>
        </div>
      </div>
      {activeTab === "smtp" && (
      <form onSubmit={onSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Sender email address</label>
            <input value={senderEmail} onChange={(e)=>setSenderEmail(e.target.value)} type="email" placeholder="no_reply@example.com" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Sender name</label>
            <input value={senderName} onChange={(e)=>setSenderName(e.target.value)} type="text" placeholder="Example" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Host</label>
            <input value={host} onChange={(e)=>setHost(e.target.value)} type="text" placeholder="in-v0.mailjet.com" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
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
            <input value={username} onChange={(e)=>setUsername(e.target.value)} type="text" placeholder="Qei3Z8HHb16y5j9mS5ac4r52ehATPOE0oWrGjd" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">Password</label>
            <input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="••••••••" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
          </div>
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {credentialsSet ? "Credentials saved encrypted" : "No credentials saved"}
        </div>
        <div className="flex justify-end">
          <button disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--on-primary)]">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
      )}

      {activeTab === "templates" && (
        <TemplatesList onSelect={({ eventKey }) => { setShowTemplatesModal(true); setSelectedEvent(eventKey); }} />
      )}
      {activeTab === "events" && (
        <STMPEvents />
      )}
      {activeTab === "configuration" && (
        <STMPConfiguration />
      )}
      {activeTab === "otp" && (
        <STMPOtp />
      )}
      {activeTab === "invite" && (
        <STMInvite />
      )}
      <SMTPSettingsModal isOpen={showSmtpModal} onClose={()=>setShowSmtpModal(false)} />
      <TemplatesModal isOpen={showTemplatesModal} onClose={()=>setShowTemplatesModal(false)} initialEventKey={selectedEvent || null} />
    </div>
  );
}
