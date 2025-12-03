"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserRecord } from "./types";
import { checkAccess, fetchUsers } from "./utils/adminAuth";
import { getThemeStyles } from "@/styles/colors";
import UsersPanel from "./components/UsersPanel";
import { Cog6ToothIcon, UsersIcon, ArrowPathIcon, PowerIcon } from "@heroicons/react/24/outline";
import STMPPanel from "./components/STMPPanel";

export default function AuthClientAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "stmp">("users");

  const tabs: { id: "users" | "stmp"; label: string; section: string; icon: React.ReactNode }[] = [
    { id: "users", label: "Users", section: "Manage", icon: <UsersIcon className="w-4 h-4" /> },
    { id: "stmp", label: "SMTP", section: "Configuration", icon: <Cog6ToothIcon className="w-4 h-4" /> },
  ];

  const handleLogout = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch {}
    setIsAuthenticated(false);
    setUsers([]);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchUsers();
    setLoading(false);

    if (result.success && result.users) {
      setUsers(result.users);
    } else {
      setError(result.error || "Failed to load users");
      if (result.error === "Not authenticated") {
        handleLogout();
      }
    }
  }, [handleLogout]);

  useEffect(() => {
    (async () => {
      const { allowed } = await checkAccess();
      if (allowed) {
        setIsAuthenticated(true);
        setLoading(false);
        loadUsers();
      } else {
        setLoading(false);
      }
    })();
  }, [loadUsers]);

  

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query) ||
      user._id.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div style={getThemeStyles(true) as React.CSSProperties} className="min-h-screen bg-[var(--background)] grid place-items-center p-6">
        <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-[var(--text)] mb-2">Loading</h1>
          <p className="text-sm text-[var(--text-muted)]">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={getThemeStyles(true) as React.CSSProperties} className="min-h-screen bg-[var(--background)] grid place-items-center p-6">
        <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-[var(--text)] mb-2">Unauthorized Access</h1>
          <p className="text-sm text-[var(--text-muted)]">You need &quot;Auth-Client Access&quot; permission to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={getThemeStyles(true) as React.CSSProperties} className="min-h-screen bg-[var(--background)]">
      <div className="relative">
        <aside className="fixed left-0 top-0 h-screen w-64">
          <div className="h-full bg-[var(--card)] border-r border-[var(--border)] rounded-none p-3">
            <div className="px-2 py-2 text-xs font-semibold text-[var(--text-muted)]">Manage</div>
            {tabs.filter(t => t.section === "Manage").map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm mb-1 border ${activeTab===t.id?"bg-[var(--surface)] border-[var(--primary)]":"bg-transparent border-transparent hover:bg-[var(--surface)]"} text-[var(--text)]`}>
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
            <div className="px-2 pt-3 pb-2 text-xs font-semibold text-[var(--text-muted)]">Configuration</div>
            {tabs.filter(t => t.section === "Configuration").map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm mb-1 border ${activeTab===t.id?"bg-[var(--surface)] border-[var(--primary)]":"bg-transparent border-transparent hover:bg-[var(--surface)]"} text-[var(--text)]`}>
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
            <div className="mt-4 flex items-center gap-2">
              <button onClick={loadUsers} className="flex-1 px-3 py-2 rounded-md bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] text-sm flex items-center justify-center gap-2" disabled={loading}>
                <ArrowPathIcon className="w-4 h-4" />
                <span>{loading ? "Updating" : "Update"}</span>
              </button>
              <button onClick={handleLogout} className="px-3 py-2 rounded-md bg-[var(--danger)] hover:bg-red-600 text-white text-sm flex items-center gap-2">
                <PowerIcon className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        <main className="ml-64 p-6">
            <div className="mb-6">
              {(() => {
                const headers = {
                  users: { title: "Auth Client", subtitle: "User management panel" },
                  stmp: { title: "SMTP", subtitle: "SMTP email notifications" },
                } as const;
                const { title, subtitle } = headers[activeTab];
                return (
                  <>
                    <h1 className="text-3xl font-bold text-[var(--text)]">{title}</h1>
                    <p className="text-[var(--text-muted)]">{subtitle}</p>
                  </>
                );
              })()}
            </div>
            
            {/* ADMIN USERS PANEL */}
            {activeTab === "users" && (
              <UsersPanel
                users={users}
                filteredUsers={filteredUsers}
                searchQuery={searchQuery}
                onSearchChange={(v) => setSearchQuery(v)}
                error={error}
                loading={loading}
                onUpdate={loadUsers}
              />
            )}
            
            {/* STMP PANEL */}
            {activeTab === "stmp" && <STMPPanel />}
        </main>
      </div>
    </div>
  );
}
