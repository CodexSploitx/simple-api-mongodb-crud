"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface TemplateDoc {
  eventKey: string;
  name: string;
  subject: string;
  body: string;
  active?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialEventKey?: string | null;
}

export default function TemplatesModal({ isOpen, onClose, initialEventKey }: Props) {
  const [templates, setTemplates] = useState<TemplateDoc[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"list"|"editor">("list");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<"360"|"600"|"800"|"full">("600");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [codeConfirmation, setCodeConfirmation] = useState<string>("");
  const [eventKey, setEventKey] = useState<string>("");
  const [active, setActive] = useState<boolean>(false);
  const [showMoreBody, setShowMoreBody] = useState<boolean>(false);
  const subjectRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [editorWrap, setEditorWrap] = useState<boolean>(true);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const [editorModalOpen, setEditorModalOpen] = useState<boolean>(false);
  const lineRefFull = useRef<HTMLDivElement | null>(null);
  interface UserRecord { _id: string; username: string; email: string; role: string }
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const isDefault = useMemo(() => name === "__default__", [name]);

  const defaultSubjectByEvent = useMemo((): Record<string, string> => ({
    confirm_sign_up: "Confirm Your Signup",
    invite_user: "You're invited to join",
    magic_link: "Your magic link",
    change_email: "Confirm your email change",
    reset_password: "Reset your password",
    reauthentication: "Reauthenticate to continue",
  }), []);

  const loadTemplates = useCallback(async (ek?: string) => {
    try {
      const key = (ek ?? initialEventKey ?? eventKey) || "";
      if (!key) { setTemplates([]); return; }
      const r = await fetch(`/api/stmp/templates?eventKey=${encodeURIComponent(key)}`, { credentials: "include" });
      const j = await r.json();
      if (j?.success && Array.isArray(j?.data)) {
        setTemplates(j.data as TemplateDoc[]);
      } else {
        setTemplates([]);
      }
    } catch { setTemplates([]); }
  }, [initialEventKey, eventKey]);

  useEffect(() => { if (isOpen) loadTemplates(initialEventKey || undefined); }, [isOpen, initialEventKey, loadTemplates]);
  useEffect(() => {
    if (!isOpen) return;
    const fake: UserRecord = {
      _id: "000000000000000000000000",
      username: "Example User",
      email: "user@example.com",
      role: "user",
    };
    setUsers([fake]);
    setSelectedUserId(String(fake._id));
  }, [isOpen]);
  useEffect(() => {
    if (isOpen) {
      if (initialEventKey) setEventKey(initialEventKey);
      setName("");
      setSubject(defaultSubjectByEvent[String(initialEventKey || "")] || "");
      setBody("");
      setActive(false);
      setSelectedIndex(null);
      setActiveTab("list");
    }
  }, [isOpen, initialEventKey, defaultSubjectByEvent]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const finalName = isDefault ? "__default__" : name;
      const r = await fetch("/api/stmp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventKey, name: finalName, subject, body, active }),
      });
      const j = await r.json();
      if (j?.success) {
        setName("");
        setSubject("");
        setBody("");
        await loadTemplates(eventKey);
        setActiveTab("list");
        setSelectedIndex(null);
      } else {
        setError(j?.error || "Error saving template");
      }
    } catch {
      setError("Error saving template");
    } finally {
      setSaving(false);
    }
  };

  const placeholders = useMemo(() => {
    const common = [
      { label: "{{ .EmailUSer }}", value: "{{ .EmailUSer }}", title: "Email of the user" },
      { label: "{{ .UserName }}", value: "{{ .UserName }}", title: "Name of the user" },
      { label: "{{ .SiteURL }}", value: "{{ .SiteURL }}", title: "Site URL" },
      { label: "{{ ._id }}", value: "{{ ._id }}", title: "ID of the user" },
    ];
    const otpVars = [
      { label: "{{ .CodeConfirmation }}", value: "{{ .CodeConfirmation }}", title: "6-digit OTP code" },
    ];
    const inviteVars = [
      { label: "{{ .Token }}", value: "{{ .Token }}", title: "Invite token" },
      { label: "{{ .PromoCode }}", value: "{{ .PromoCode }}", title: "Promo code for invitee" },
      { label: "{{ .RewardTitle }}", value: "{{ .RewardTitle }}", title: "Reward title" },
      { label: "{{ .RewardText }}", value: "{{ .RewardText }}", title: "Reward description" },
    ];
    const magicLinkVars = [
      { label: "{{ .Token }}", value: "{{ .Token }}", title: "Magic link token" },
    ];
    if (eventKey === "invite_user") return [...common, ...inviteVars];
    if (eventKey === "magic_link") return [...common, ...magicLinkVars];
    if (eventKey === "confirm_sign_up" || eventKey === "reset_password" || eventKey === "reauthentication" || eventKey === "change_email") return [...common, ...otpVars];
    return common;
  }, [eventKey]);

  const essentialValues = useMemo(() => {
    if (eventKey === "invite_user") {
      return new Set(["{{ .EmailUSer }}", "{{ .UserName }}", "{{ .Token }}", "{{ .SiteURL }}"]);
    }
    if (eventKey === "magic_link") {
      return new Set(["{{ .EmailUSer }}", "{{ .UserName }}", "{{ .Token }}", "{{ .SiteURL }}"]);
    }
    return new Set(["{{ .EmailUSer }}", "{{ .UserName }}", "{{ .CodeConfirmation }}", "{{ .SiteURL }}"]);
  }, [eventKey]);
  const essentials = useMemo(() => placeholders.filter(p => essentialValues.has(p.value)), [placeholders, essentialValues]);
  const extras = useMemo(() => placeholders.filter(p => !essentialValues.has(p.value)), [placeholders, essentialValues]);
  const subjectAllowed = useMemo(() => {
    if (eventKey === "invite_user") {
      return placeholders.filter(p => p.value === "{{ .UserName }}" || p.value === "{{ .RewardTitle }}" || p.value === "{{ .PromoCode }}");
    }
    return placeholders.filter(p => p.value === "{{ .UserName }}" || p.value === "{{ .CodeConfirmation }}");
  }, [placeholders, eventKey]);

  const insertPlaceholder = (ph: string, target: "subject"|"body") => {
    if (target === "subject") {
      const el = subjectRef.current;
      const current = subject;
      if (el) {
        const start = el.selectionStart ?? current.length;
        const end = el.selectionEnd ?? start;
        const next = current.slice(0, start) + ph + current.slice(end);
        setSubject(next);
        requestAnimationFrame(() => {
          const pos = start + ph.length;
          if (subjectRef.current) {
            subjectRef.current.focus();
            subjectRef.current.setSelectionRange(pos, pos);
          }
        });
      } else {
        setSubject(current + " " + ph);
      }
    } else {
      const el = bodyRef.current;
      const current = body;
      if (el) {
        const start = el.selectionStart ?? current.length;
        const end = el.selectionEnd ?? start;
        const next = current.slice(0, start) + ph + current.slice(end);
        setBody(next);
        requestAnimationFrame(() => {
          const pos = start + ph.length;
          if (bodyRef.current) {
            bodyRef.current.focus();
            bodyRef.current.setSelectionRange(pos, pos);
          }
        });
      } else {
        setBody(current + "\n" + ph);
      }
    }
  };

  const generateCode = () => {
    const v = String(Math.floor(100000 + Math.random()*900000));
    setCodeConfirmation(v);
  };

  const sanitizeHtml = (html: string): string => {
    let out = html;
    out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    out = out.replace(/on[a-z]+\s*=\s*"[^"]*"/gi, "");
    out = out.replace(/on[a-z]+\s*=\s*'[^']*'/gi, "");
    out = out.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#" ');
    out = out.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#' ");
    return out;
  };

  const renderPreviewHtml = () => {
    const code = codeConfirmation || "000000";
    const siteUrl = (typeof window !== 'undefined' ? window.location.origin : '') || (process.env.API_BASE_URL || "");
    const user = users.find(u => String(u._id) === selectedUserId);
    let out = body;
    out = out.replaceAll("{{ .SiteURL }}", siteUrl);
    if (eventKey !== "invite_user") {
      out = out.replaceAll("{{ .CodeConfirmation }}", code);
    }
    const email = user?.email || "user@example.com";
    const username = user?.username || "Example User";
    out = out.replaceAll("{{ .EmailUSer }}", email);
    out = out.replaceAll("{{ .UserName }}", username);
    if (user) {
      out = out.replaceAll("{{ ._id }}", String(user._id));
    }
    if (eventKey === "invite_user") {
      const token = "INVITE_TOKEN_EXAMPLE";
      out = out.replaceAll("{{ .Token }}", token);
      out = out.replaceAll("{{ .PromoCode }}", "WELCOME10");
      out = out.replaceAll("{{ .RewardTitle }}", "Welcome Bonus");
      out = out.replaceAll("{{ .RewardText }}", "Get 10% off on your first purchase.");
    }
    return sanitizeHtml(out);
  };

  const setActiveForEvent = async (t: TemplateDoc) => {
    setError("");
    try {
      const r = await fetch("/api/stmp/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ eventKey: t.eventKey || eventKey, name: t.name, subject: t.subject, body: t.body, active: true }),
      });
      const j = await r.json();
      if (j?.success) {
        await loadTemplates(eventKey);
      } else {
        setError(j?.error || "Error setting template as active");
      }
    } catch {
      setError("Error setting template as active");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 w-full max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">Templates</h3>
          <button className="text-sm text-[var(--text-muted)]" onClick={onClose}>Close</button>
        </div>
        {error && <div className="mb-4 text-sm text-red-500">{error}</div>}
        <div className="flex gap-4 border-b border-[var(--border)] mb-4">
          <button onClick={()=>setActiveTab("list")} className={`px-2 py-1 text-sm ${activeTab==='list' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>Templates</button>
          <button onClick={()=>setActiveTab("editor")} className={`px-2 py-1 text-sm ${activeTab==='editor' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>Editor</button>
        </div>

        {activeTab === "list" && (
          <div>
            <div className="flex justify-end mb-2">
              <button onClick={()=>{ setName(""); setSubject(defaultSubjectByEvent[eventKey] || ""); setBody(""); setSelectedIndex(null); setActive(false); setActiveTab('editor'); }} className="px-3 py-1 text-xs rounded bg-[var(--primary)] text-[var(--on-primary)]">Crear template</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto">
              {templates.length === 0 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[var(--text-muted)]">Sin templates</div>
                </div>
              )}
              {templates.map((t, idx) => (
                <div key={t.name} className={`w-full p-3 rounded-lg border border-[var(--border)] hover:bg-[var(--card)] ${selectedIndex===idx ? 'ring-2 ring-[var(--primary)]' : ''}`}>
                  <div className="flex items-center justify-between">
                    <button onClick={()=>{ setSelectedIndex(idx); setName(t.name); setSubject(t.subject); setBody(t.body); setActiveTab('editor'); }} className="text-left flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-[var(--text)]">{t.name}</div>
                        {t.active && <span className="px-2 py-0.5 text-[10px] rounded bg-[var(--primary)] text-[var(--on-primary)]">Active</span>}
                        {t.name === "__default__" && <span className="px-2 py-0.5 text-[10px] rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)]">Default</span>}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">{t.subject}</div>
                    </button>
                    <button aria-label={t.active ? 'Active' : 'Inactive'} disabled={t.active} onClick={(e)=>{ e.stopPropagation(); if (!t.active) setActiveForEvent(t); }} className={`ml-3 w-10 h-5 rounded-full relative ${t.active ? 'bg-[var(--primary)] opacity-80 cursor-not-allowed' : 'bg-[var(--border)]'}`}>
                      <span className={`absolute top-0.5 ${t.active ? 'left-5' : 'left-0.5'} w-4 h-4 rounded-full bg-white transition-all`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "editor" && (
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Name {isDefault && <span className="ml-2 px-2 py-0.5 text-[10px] rounded bg-[var(--primary)] text-[var(--on-primary)]">Default</span>}</label>
                <input value={name} onChange={(e)=>setName(e.target.value)} type="text" placeholder="welcome" disabled={isDefault} className={`w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)] ${isDefault ? 'opacity-70 cursor-not-allowed' : ''}`} />
                {isDefault && <div className="mt-1 text-[10px] text-[var(--text-muted)]">El nombre de la plantilla por defecto está bloqueado.</div>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Subject</label>
                <input ref={subjectRef} value={subject} onChange={(e)=>setSubject(e.target.value)} type="text" placeholder="Welcome to YouStudenty" className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {subjectAllowed.map((p)=>(
                    <button key={p.value} title={p.title} type="button" onClick={()=>insertPlaceholder(p.value, 'subject')} className="px-2 py-1 text-xs rounded border border-[var(--border)] text-[var(--text)]">
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[var(--text)]">Body</label>
                  <div className="flex gap-2">
                  <button type="button" disabled={body.trim().length === 0} onClick={()=>{ if(body.trim().length === 0) return; generateCode(); setPreviewOpen(true); }} className={`px-3 py-1 text-xs rounded ${body.trim().length > 0 ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed'}`}>Preview</button>
                  </div>
                </div>
              <div className="mb-2">
                <div className="text-xs text-[var(--text-muted)]">Fictitious data are used; no real data are exposed.</div>
              </div>
              <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-[var(--card)] border-b border-[var(--border)]">
                  <div className="text-xs font-semibold text-[var(--text)]">HTML</div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={()=>setEditorWrap(w=>!w)} className="px-2 py-1 text-xs rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">{editorWrap ? 'Wrap: On' : 'Wrap: Off'}</button>
                    <button type="button" onClick={()=>setEditorModalOpen(true)} className="px-2 py-1 text-xs rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">Extand editor</button>
                  </div>
                </div>
                <div className="flex">
                  <div ref={lineRef} className="h-96 overflow-hidden bg-[#0b0e14] text-[#637777] text-xs font-mono border-r border-[var(--border)]">
                    {Array.from({ length: (body.split('\n').length || 1) }, (_, i) => i + 1).map(n => (
                      <div key={n} className="h-6 leading-6 px-2">{n}</div>
                    ))}
                  </div>
                  <textarea
                    ref={bodyRef}
                    value={body}
                    onChange={(e)=>setBody(e.target.value)}
                    onScroll={(e)=>{ if (lineRef.current) lineRef.current.scrollTop = e.currentTarget.scrollTop; }}
                    rows={16}
                    placeholder="HTML"
                    className={`flex-1 h-96 p-3 font-mono text-sm bg-[#0b0e14] text-[#e6edf3] outline-none ${editorWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'} leading-6`}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {essentials.map((p)=>(
                  <button key={p.value} title={p.title} type="button" onClick={()=>insertPlaceholder(p.value, 'body')} className="px-2 py-1 text-xs rounded border border-[var(--border)] text-[var(--text)]">
                    {p.label}
                  </button>
                ))}
                <button type="button" onClick={()=>setShowMoreBody(s=>!s)} className="px-2 py-1 text-xs rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">
                  {showMoreBody ? "Hide variables" : "More variables"}
                </button>
              </div>
              {showMoreBody && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {extras.map((p)=>(
                    <button key={p.value} title={p.title} type="button" onClick={()=>insertPlaceholder(p.value, 'body')} className="px-2 py-1 text-xs rounded border border-[var(--border)] text-[var(--text)]">
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={()=>{ setActiveTab('list'); setSelectedIndex(null); }} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">Back</button>
              <button disabled={saving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-[var(--on-primary)]">{saving ? "Saving..." : "Save"}</button>
            </div>
          </form>
        )}

        {editorModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="text-sm font-semibold text-[var(--text)]">Editor</div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={()=>setEditorWrap(w=>!w)} className="px-2 py-1 text-xs rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">{editorWrap ? 'Wrap: On' : 'Wrap: Off'}</button>
                  <button className="text-xs px-3 py-1 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" onClick={()=>setEditorModalOpen(false)}>Cerrar</button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-[var(--card)]">
                <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                  <div className="flex">
                    <div ref={lineRefFull} className="h-[70vh] overflow-hidden bg-[#0b0e14] text-[#637777] text-xs font-mono border-r border-[var(--border)]">
                      {Array.from({ length: (body.split('\n').length || 1) }, (_, i) => i + 1).map(n => (
                        <div key={n} className="h-6 leading-6 px-2">{n}</div>
                      ))}
                    </div>
                    <textarea
                      value={body}
                      onChange={(e)=>setBody(e.target.value)}
                      onScroll={(e)=>{ if (lineRefFull.current) lineRefFull.current.scrollTop = e.currentTarget.scrollTop; }}
                      rows={28}
                      placeholder="HTML"
                      className={`flex-1 h-[70vh] p-3 font-mono text-sm bg-[#0b0e14] text-[#e6edf3] outline-none ${editorWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'} leading-6`}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {essentials.map((p)=>(
                    <button key={p.value} title={p.title} type="button" onClick={()=>insertPlaceholder(p.value, 'body')} className="px-2 py-1 text-xs rounded border border-[var(--border)] text-[var(--text)]">
                      {p.label}
                    </button>
                  ))}
                  <button type="button" onClick={()=>setShowMoreBody(s=>!s)} className="px-2 py-1 text-xs rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">
                    {showMoreBody ? 'Hide variables' : 'More variables'}
                  </button>
                </div>
                {showMoreBody && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {extras.map((p)=>(
                      <button key={p.value} title={p.title} type="button" onClick={()=>insertPlaceholder(p.value, 'body')} className="px-2 py-1 text-xs rounded border border-[var(--border)] text-[var(--text)]">
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {previewOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <div className="text-sm font-semibold text-[var(--text)]">Preview</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-[var(--text-muted)] mr-1">Ancho</span>
                    <button onClick={()=>setPreviewWidth("360")} className={`px-2 py-1 rounded border text-xs ${previewWidth==='360' ? 'bg-[var(--primary)] text-[var(--on-primary)] border-transparent' : 'bg-[var(--card)] text-[var(--text)] border-[var(--border)]'}`}>360</button>
                    <button onClick={()=>setPreviewWidth("600")} className={`px-2 py-1 rounded border text-xs ${previewWidth==='600' ? 'bg-[var(--primary)] text-[var(--on-primary)] border-transparent' : 'bg-[var(--card)] text-[var(--text)] border-[var(--border)]'}`}>600</button>
                    <button onClick={()=>setPreviewWidth("800")} className={`px-2 py-1 rounded border text-xs ${previewWidth==='800' ? 'bg-[var(--primary)] text-[var(--on-primary)] border-transparent' : 'bg-[var(--card)] text-[var(--text)] border-[var(--border)]'}`}>800</button>
                    <button onClick={()=>setPreviewWidth("full")} className={`px-2 py-1 rounded border text-xs ${previewWidth==='full' ? 'bg-[var(--primary)] text-[var(--on-primary)] border-transparent' : 'bg-[var(--card)] text-[var(--text)] border-[var(--border)]'}`}>Full</button>
                  </div>
                  <button className="text-xs px-3 py-1 rounded bg-[var(--card)] border border-[var(--border)] text-[var(--text)]" onClick={()=>setPreviewOpen(false)}>Close</button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-[var(--card)]">
                <div className="mx-auto" style={{ width: previewWidth==='full' ? '100%' : `${previewWidth}px` }}>
                  <div className="rounded-lg shadow-lg overflow-hidden border border-[var(--border)] bg-transparent">
                    <div className="p-0">
                      <div dangerouslySetInnerHTML={{ __html: renderPreviewHtml() }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
