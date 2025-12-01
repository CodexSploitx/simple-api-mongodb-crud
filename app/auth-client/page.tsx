"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserRecord } from "./types";
import { checkAccess, fetchUsers } from "./utils/adminAuth";
import { getThemeStyles } from "@/styles/colors";
import UserTable from "./components/UserTable";

export default function AuthClientAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
          <h1 className="text-xl font-semibold text-[var(--text)] mb-2">Cargando</h1>
          <p className="text-sm text-[var(--text-muted)]">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={getThemeStyles(true) as React.CSSProperties} className="min-h-screen bg-[var(--background)] grid place-items-center p-6">
        <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-[var(--text)] mb-2">Acceso no autorizado</h1>
          <p className="text-sm text-[var(--text-muted)]">Necesitas permiso de &quot;Auth-Client Access&quot; para gestionar usuarios.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={getThemeStyles(true) as React.CSSProperties} className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text)] mb-1">Auth Client Admin</h1>
            <p className="text-[var(--text-muted)]">Manage your application users</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadUsers}
              className="px-4 py-2 rounded-md bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] transition-colors"
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md bg-[var(--danger)] hover:bg-red-600 text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-muted)] mb-1">Total Users</div>
            <div className="text-2xl font-bold text-[var(--text)]">
              {searchQuery ? `${filteredUsers.length} / ${users.length}` : users.length}
            </div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-muted)] mb-1">Database</div>
            <div className="text-lg font-medium text-[var(--text)]">{process.env.NEXT_PUBLIC_AUTH_CLIENT_DB || "authclient"}</div>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-muted)] mb-1">Collection</div>
            <div className="text-lg font-medium text-[var(--text)]">{process.env.NEXT_PUBLIC_AUTH_CLIENT_COLLECTION || "users"}</div>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-[var(--text)]">Users</h2>
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by email, username, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none text-sm"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-500">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-8 text-center text-[var(--text-muted)]">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">
              {searchQuery ? "No users match your search" : "No users found"}
            </div>
          ) : (
            <UserTable users={filteredUsers} onUpdate={loadUsers} />
          )}
        </div>
      </div>
    </div>
  );
}
