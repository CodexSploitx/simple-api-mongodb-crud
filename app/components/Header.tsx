"use client";
import React, { useState } from "react";
import type { ButtonClasses } from "../types";

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
}) => {
  const [actionsOpen, setActionsOpen] = useState(false);
  return (
    <header className={`${cardClasses} rounded-none border-b p-4 mb-6 relative`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--on-accent)] text-base">database</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)]">MongoDB Admin</h1>
            <p className="text-sm text-[var(--text-muted)]">Database Management Console</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 relative">
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
              <span className="material-symbols-outlined text-[var(--text)] text-base">bolt</span>
              <span>Actions</span>
            </span>
          </button>

          {actionsOpen && (
            <div className={`absolute right-0 top-12 min-w-[220px] p-2 rounded-lg border shadow-lg ${cardClasses}`} role="menu">
              <button
                onClick={() => {
                  if (!isConnected) return;
                  onOpenCreateModal();
                  setActionsOpen(false);
                }}
                disabled={!isConnected}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 ${buttonClasses.primary}`}
                role="menuitem"
              >
                <span className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[var(--on-primary)] text-base">add</span>
                  <span>Add Document</span>
                </span>
              </button>
              <button
                onClick={() => {
                  onOpenCreateDbModal();
                  setActionsOpen(false);
                }}
                className={`mt-2 w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
                role="menuitem"
              >
                <span className="flex items-center space-x-2">
                  <span className="material-symbols-outlined text-[var(--text)] text-base">database</span>
                  <span>Create DB/Collection</span>
                </span>
              </button>
            </div>
          )}

          <button
            onClick={onToggleDarkMode}
            className={`p-2 rounded-lg ${buttonClasses.secondary} text-sm`}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <span className="material-symbols-outlined text-[var(--text)] text-base">
              {darkMode ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;