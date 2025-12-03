"use client";

import React, { useEffect, useState, useCallback } from "react";

interface OutboxEntry {
  _id: string;
  eventKey: string;
  to: string;
  subject: string;
  status: string;
  queuedAt?: string;
  sentAt?: string;
  attempts?: number;
  lastError?: string | null;
}

export default function STMPEvents() {
  const [status, setStatus] = useState<string>("");
  const [eventKey, setEventKey] = useState<string>("");
  const [items, setItems] = useState<OutboxEntry[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [info, setInfo] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (eventKey) params.set("eventKey", eventKey);
      params.set("limit", "100");
      const r = await fetch(`/api/stmp/outbox?${params.toString()}`, { credentials: "include" });
      const j = await r.json();
      if (j?.success) { setItems(j.data || []); setCounts(j.counts || {}); }
    } catch {}
    setLoading(false);
  }, [status, eventKey]);

  useEffect(() => { load(); }, [load]);

  const processQueue = async () => {
    setProcessing(true); setInfo("");
    try {
      const r = await fetch(`/api/stmp/outbox/process`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50, eventKey }),
      });
      const j = await r.json();
      if (j?.success) setInfo(`Processed: ${j.processed}, Sent: ${j.sent}, Failed: ${j.failed}`);
    } catch {}
    setProcessing(false);
    load();
  };

  const cleanup = async () => {
    setProcessing(true); setInfo("");
    try {
      const r = await fetch(`/api/stmp/outbox/cleanup`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ olderThanDays: 7 }) });
      const j = await r.json();
      if (j?.success) setInfo(`Deleted: ${j.deleted}`);
    } catch {}
    setProcessing(false);
    load();
  };

  return (
    <div>
      <div className="text-sm font-semibold text-[var(--text)] mb-2">Events</div>
      <div className="flex items-end gap-3 mb-3">
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Status</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value)} className="px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)] text-xs">
            <option value="">All</option>
            <option value="queued">queued</option>
            <option value="retry">retry</option>
            <option value="failed">failed</option>
            <option value="sent">sent</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--text-muted)] mb-1">Event</label>
          <input value={eventKey} onChange={(e)=>setEventKey(e.target.value)} placeholder="confirm_sign_up" className="px-2 py-1 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)] text-xs" />
        </div>
        <button onClick={load} className="px-3 py-1 text-xs rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">Refresh</button>
        <button onClick={processQueue} disabled={processing} className="px-3 py-1 text-xs rounded bg-[var(--primary)] text-[var(--on-primary)] disabled:opacity-50">Process Queue</button>
        <button onClick={cleanup} disabled={processing} className="px-3 py-1 text-xs rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">Clean Old</button>
      </div>
      {info && <div className="mb-3 text-xs text-[var(--text)]">{info}</div>}
      <div className="text-xs text-[var(--text)] mb-2">Counts: queued {counts["queued"]||0}, retry {counts["retry"]||0}, failed {counts["failed"]||0}, sent {counts["sent"]||0}</div>
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="grid grid-cols-6 gap-0 px-3 py-2 bg-[var(--card)] text-[var(--text)] text-xs">
          <div>Event</div><div>To</div><div>Subject</div><div>Status</div><div>Queued</div><div>Sent</div>
        </div>
        <div className="max-h-80 overflow-auto">
          {loading ? (
            <div className="p-3 text-[var(--text)] text-xs">Loading…</div>
          ) : items.length === 0 ? (
            <div className="p-3 text-[var(--text)] text-xs">No entries</div>
          ) : (
            items.map((it) => (
              <div key={String(it._id)} className="grid grid-cols-6 gap-0 px-3 py-2 border-t border-[var(--border)] text-xs text-[var(--text)]">
                <div className="truncate">{it.eventKey}</div>
                <div className="truncate">{it.to}</div>
                <div className="truncate">{it.subject}</div>
                <div className="truncate">{it.status}{typeof it.attempts === 'number' ? ` (${it.attempts})` : ''}</div>
                <div className="truncate">{it.queuedAt ? new Date(it.queuedAt).toLocaleString() : '-'}</div>
                <div className="truncate">{it.sentAt ? new Date(it.sentAt).toLocaleString() : '-'}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
