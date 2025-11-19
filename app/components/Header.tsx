"use client";
import React, { useState, useEffect } from "react";
import type { ButtonClasses } from "../types";
import { CircleStackIcon, UserIcon, BoltIcon, PlusIcon, SunIcon, MoonIcon, ArrowRightStartOnRectangleIcon, SparklesIcon } from "@heroicons/react/24/outline";

interface HeaderProps {
  darkMode: boolean;
  isConnected: boolean;
  connectedDb: string;
  connectedCollection: string;
  onToggleDarkMode: () => void;
  onOpenCreateModal: () => void;
  onOpenCreateDbModal: () => void;
  cardClasses: string;
  buttonClasses: ButtonClasses;
  canCreateDocument?: boolean;
  canCreateDbCollection?: boolean;
  disableReasonCreateDoc?: string;
  disableReasonCreateDb?: string;
  currentUserName?: string;
  currentUserRole?: "admin" | "user";
  onLogoutRedirectUrl?: string;
}

const Header: React.FC<HeaderProps> = ({
  darkMode,
  isConnected,
  connectedDb,
  connectedCollection,
  onToggleDarkMode,
  onOpenCreateModal,
  onOpenCreateDbModal,
  cardClasses,
  buttonClasses,
  canCreateDocument = true,
  canCreateDbCollection = true,
  disableReasonCreateDoc,
  disableReasonCreateDb,
  currentUserName,
  currentUserRole,
  onLogoutRedirectUrl,
}) => {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [displayUserName, setDisplayUserName] = useState<string | undefined>(currentUserName);
  const [displayUserRole, setDisplayUserRole] = useState<"admin" | "user" | undefined>(currentUserRole);

  // Mantener sincronía si el padre nos pasa usuario
  useEffect(() => {
    setDisplayUserName(currentUserName);
    setDisplayUserRole(currentUserRole);
  }, [currentUserName, currentUserRole]);

  // Fallback: si no hay usuario por props, intentar obtenerlo del backend
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        const user = json?.data;
        if (user?.username) setDisplayUserName(user.username);
        if (user?.role === "admin" || user?.role === "user") setDisplayUserRole(user.role);
      } catch {
        // Silenciar errores en Header; el Dashboard maneja errores globales
      }
    };
    if (!currentUserName && !currentUserRole) {
      fetchUser();
    }
  }, [currentUserName, currentUserRole]);
  return (
    <header className={`${cardClasses} rounded-none border-b p-4 mb-6 relative`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
            <CircleStackIcon className="w-5 h-5 text-[var(--on-accent)]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-semibold text-[var(--text)]">MongoDB Admin</h1>
            </div>
            <p className="text-sm text-[var(--text-muted)]">Database Management Console</p>
          </div>
        </div>

        <div className="flex-1 flex justify-center">
          <button
            onClick={() => { window.location.href = "/api-rest"; }}
            className={`group px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 ${buttonClasses.primary}`}
            title="Generate REST API docs"
          >
            <span className="flex items-center space-x-2">
              <SparklesIcon className="w-4 h-4 text-[var(--on-primary)] transition-transform duration-200 group-hover:rotate-12" />
              <span>REST API</span>
            </span>
          </button>
        </div>
        <div className="flex items-center space-x-3 relative">
          {displayUserName && (
            <div className="group flex items-center gap-3 px-3 py-2 rounded-full bg-[var(--surface)]/80 border border-[var(--border)] shadow-sm hover:shadow-md hover:bg-[var(--surface)] transition">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/15 ring-1 ring-[var(--border)]">
                <UserIcon className="w-4 h-4 text-[var(--accent)]" />
              </div>
              <div className="flex items-center">
                <span className="text-sm font-medium text-[var(--text)]">{displayUserName}</span>
                {displayUserRole && (
                  <span
                    className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${displayUserRole === 'admin' ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-[var(--accent)]/10 border-[var(--accent)]/30 text-[var(--accent)]'}`}
                  >
                    {displayUserRole}
                  </span>
                )}
              </div>
            </div>
          )}
          {isConnected && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-md shadow-sm">
              <div className="w-2 h-2 bg-[var(--success)] rounded-full"></div>
              <span className="text-xs font-medium text-[var(--text)]">
                {connectedDb}.{connectedCollection}
              </span>
            </div>
          )}

          <button
            onClick={() => setActionsOpen((v) => !v)}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${buttonClasses.secondary}`}
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
          >
            <span className="flex items-center space-x-2">
              <BoltIcon className="w-4 h-4 text-[var(--text)]" />
              <span>Actions</span>
            </span>
          </button>

          {actionsOpen && (
            <div className={`absolute right-0 top-12 min-w-[220px] p-2 rounded-lg border shadow-lg z-50 ${cardClasses}`} role="menu">
              <button
                onClick={() => {
                  if (!isConnected || !canCreateDocument) return;
                  onOpenCreateModal();
                  setActionsOpen(false);
                }}
                disabled={!isConnected || !canCreateDocument}
                title={!isConnected ? "Connect first to add documents" : (!canCreateDocument ? (disableReasonCreateDoc || "You don't have permission to create documents") : undefined)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 ${buttonClasses.primary}`}
                role="menuitem"
              >
                <span className="flex items-center space-x-2">
                  <PlusIcon className="w-4 h-4 text-[var(--on-primary)]" />
                  <span>Add Document</span>
                </span>
              </button>
              <button
                onClick={() => {
                  if (!canCreateDbCollection) return;
                  onOpenCreateDbModal();
                  setActionsOpen(false);
                }}
                disabled={!canCreateDbCollection}
                title={!canCreateDbCollection ? (disableReasonCreateDb || "Only admins can create databases/collections") : undefined}
                className={`mt-2 w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
                role="menuitem"
              >
                <span className="flex items-center space-x-2">
                  <CircleStackIcon className="w-4 h-4 text-[var(--text)]" />
                  <span>Create DB/Collection</span>
                </span>
              </button>
              <div className="my-2 border-t border-[var(--border)]" />

            </div>
          )}

          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg ${buttonClasses.secondary} text-sm`}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? (
              <SunIcon className="w-4 h-4 text-[var(--text)]" />
            ) : (
              <MoonIcon className="w-4 h-4 text-[var(--text)]" />
            )}
          </button>

          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                if (res.ok) {
                  const target = onLogoutRedirectUrl || '/auth/sing-in';
                  window.location.href = target;
                }
              } catch (e) {
                // Silenciar errores en UI
              }
            }}
            className={`group p-2 rounded-lg ${buttonClasses.secondary} text-sm hover:bg-[var(--surface)] transition`}
            title="Logout"
            aria-label="Logout"
          >
            <ArrowRightStartOnRectangleIcon className="w-4 h-4 text-[var(--text-muted)] group-hover:text-red-600" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;