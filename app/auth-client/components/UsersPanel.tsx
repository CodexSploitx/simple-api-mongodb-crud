"use client";

import React, { useState } from "react";
import type { UserRecord } from "../types";
import UserTable from "./UserTable";
import RegistrationChart from "./RegistrationChart";
 
 

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
  const [range, setRange] = useState<"1d" | "7d" | "30d">("7d");
  return (
    <div>
      <div className="mb-6">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
          <RegistrationChart
            users={users}
            range={range}
            headerRight={
              <div className="flex items-center gap-2">
                {(["1d", "7d", "30d"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setRange(opt)}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] border transition-colors ${
                      range === opt
                        ? "bg-[var(--surface)] border-[var(--primary)] text-[var(--text)]"
                        : "bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--card)]"
                    }`}
                    title={opt === "1d" ? "Último día" : opt === "7d" ? "Última semana" : "Último mes"}
                  >
                    {opt === "1d" ? "1D" : opt === "7d" ? "7D" : "1M"}
                  </button>
                ))}
              </div>
            }
          />
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
