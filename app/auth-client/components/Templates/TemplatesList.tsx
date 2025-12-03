"use client";

import React, { useEffect, useState } from "react";

interface TemplateItem {
  key: string;
  title: string;
  description: string;
  defaultSubject: string;
}

interface ExistingTemplate {
  eventKey: string;
  name: string;
  subject: string;
  body: string;
  active?: boolean;
}

interface Props {
  onSelect: (info: { eventKey: string; name: string; subject: string; body?: string }) => void;
}

const ITEMS: TemplateItem[] = [
  { key: "confirm_sign_up", title: "Confirm sign up", description: "Ask users to confirm their email address after signing up", defaultSubject: "Confirm Your Signup" },
  { key: "invite_user", title: "Invite user", description: "Invite users who don't yet have an account to sign up", defaultSubject: "You're invited to join" },
  { key: "magic_link", title: "Magic link", description: "Allow users to sign in via a one-time link sent to their email", defaultSubject: "Your magic sign-in link" },
  { key: "change_email", title: "Change email address", description: "Ask users to verify their new email address after changing it", defaultSubject: "Verify your new email address" },
  { key: "reset_password", title: "Reset password", description: "Allow users to reset their password if they forget it", defaultSubject: "Reset your password" },
  { key: "reauthentication", title: "Reauthentication", description: "Ask users to re-authenticate before performing a sensitive action", defaultSubject: "Please re-authenticate" },
];

export default function TemplatesList({ onSelect }: Props) {
  const [existing, setExisting] = useState<Record<string, ExistingTemplate[]>>({});

  useEffect(() => {
    const loadAll = async () => {
      try {
        const r = await fetch("/api/stpm/templates", { credentials: "include" });
        const j = await r.json();
        if (j?.success && Array.isArray(j?.data)) {
          const map: Record<string, ExistingTemplate[]> = {};
          (j.data as ExistingTemplate[]).forEach((t) => {
            map[t.eventKey] = map[t.eventKey] || [];
            map[t.eventKey].push(t);
          });
          setExisting(map);
        }
      } catch {}
    };
    loadAll();
  }, []);

  return (
    <div>
      <div className="text-sm font-semibold text-[var(--text)] mb-2">Authentication</div>
      <div className="space-y-2">
        {ITEMS.map((item) => (
          <button
            key={item.key}
            className="w-full text-left p-4 rounded-lg border border-[var(--border)] hover:bg-[var(--card)]"
            onClick={() => {
              const existList = existing[item.key] || [];
              const activeOne = existList.find(t => t.active);
              const base = activeOne || existList[0];
              onSelect({ eventKey: item.key, name: base?.name || item.key, subject: base?.subject || item.defaultSubject, body: base?.body });
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-[var(--text)]">{item.title}</div>
                <div className="text-xs text-[var(--text-muted)]">{item.description}</div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">›</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
