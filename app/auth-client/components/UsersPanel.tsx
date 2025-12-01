"use client";

import React from "react";
import type { UserRecord } from "../types";
import UserTable from "./UserTable";

type Props = {
  users: UserRecord[];
  filteredUsers: UserRecord[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  error: string;
  loading: boolean;
  onUpdate: () => void;
};

export default function UsersPanel({ users, filteredUsers, searchQuery, onSearchChange, error, loading, onUpdate }: Props) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
          <div className="text-sm text-[var(--text-muted)] mb-1">Total Users</div>
          <div className="text-2xl font-bold text-[var(--text)]">{searchQuery ? `${filteredUsers.length} / ${users.length}` : users.length}</div>
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

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-[var(--text)]">Users</h2>
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by email, username or ID..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none text-sm"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-500">{error}</div>
        )}

        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-muted)]">{searchQuery ? "No results" : "No users"}</div>
        ) : (
          <UserTable users={filteredUsers} onUpdate={onUpdate} />
        )}
      </div>
    </div>
  );
}

