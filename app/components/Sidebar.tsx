"use client";
import React from "react";
import type { ButtonClasses } from "../types";

interface SidebarProps {
  selectedDb: string;
  selectedCollection: string;
  isConnected: boolean;
  loading: boolean;
  error?: string;
  cardClasses: string;
  inputClasses: string;
  buttonClasses: ButtonClasses;
  documentsPerPage: number;
  totalDocuments: number;
  currentPage: number;
  totalPages: number;
  onDbChange: (value: string) => void;
  onCollectionChange: (value: string) => void;
  onLoadDocuments: () => void;
  onConnect: () => void;
  onOpenCreateDbModal: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  selectedDb,
  selectedCollection,
  isConnected,
  loading,
  error,
  cardClasses,
  inputClasses,
  buttonClasses,
  documentsPerPage,
  totalDocuments,
  currentPage,
  totalPages,
  onDbChange,
  onCollectionChange,
  onLoadDocuments,
  onConnect,
  onOpenCreateDbModal,
}) => {
  return (
    <aside className={`w-80 ${cardClasses} rounded-lg p-6 h-fit`}>
      <div className="space-y-6">
        {/* Connection Section */}
        <div>
          <h2 className="text-lg font-medium text-[var(--text)] mb-4 flex items-center">
            <span className="material-symbols-outlined mr-2 text-[var(--text-muted)] text-base">link</span>
            Connection
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Database
              </label>
              <input
                type="text"
                value={selectedDb}
                onChange={(e) => onDbChange(e.target.value)}
                placeholder="Enter database name"
                className={`w-full px-3 py-2 rounded-lg text-sm ${inputClasses}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Collection
              </label>
              <input
                type="text"
                value={selectedCollection}
                onChange={(e) => onCollectionChange(e.target.value)}
                placeholder="Enter collection name"
                className={`w-full px-3 py-2 rounded-lg text-sm ${inputClasses}`}
              />
            </div>
          </div>

          <div className="space-y-3 mt-6">
            {/* Specific missing DB/collection notice & action */}
            {!isConnected && (error === "Database not found" || error === "Collection not found") && (
              <div className={`p-3 rounded-lg border ${cardClasses}`}>
                <div className="flex items-start space-x-2">
                  <span className="material-symbols-outlined text-red-500 text-base">error</span>
                  <div>
                    <p className="text-sm text-[var(--text)]">
                      {error === "Database not found" && selectedDb
                        ? `The database '${selectedDb}' does not exist.`
                        : error === "Collection not found" && selectedCollection
                        ? `The collection '${selectedCollection}' does not exist in '${selectedDb}'.`
                        : "The specified resource does not exist."}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      You can create the missing {error === "Database not found" ? "database (and collection)" : "collection"} automatically.
                    </p>
                    <button
                      onClick={onOpenCreateDbModal}
                      className={`mt-3 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
                    >
                      <span className="flex items-center justify-center space-x-2">
                        <span className="material-symbols-outlined text-[var(--text)] text-base">database</span>
                        <span>{error === "Database not found" ? "Create Database & Collection" : "Create Collection"}</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={onLoadDocuments}
              disabled={loading || !isConnected}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                !isConnected ? buttonClasses.secondary : buttonClasses.primary
              }`}
            >
              <span className="flex items-center justify-center space-x-2">
                <span className="material-symbols-outlined text-[var(--on-primary)] text-base">sync</span>
                <span>{loading ? "Loading..." : "Load Documents"}</span>
              </span>
            </button>

            <button
              onClick={onConnect}
              disabled={loading || !selectedDb || !selectedCollection}
              className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.primary}`}
            >
              <span className="flex items-center justify-center space-x-2">
                <span className="material-symbols-outlined text-[var(--on-primary)] text-base">link</span>
                <span>{loading ? "Connecting..." : "Connect"}</span>
              </span>
            </button>
          </div>
        </div>

        {/* Actions moved to Header dropdown */}

        {/* Statistics */}
        {isConnected && (
          <div className={`p-6 rounded-2xl border ${cardClasses}`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-[var(--text)]">
              <span className="material-symbols-outlined text-green-500 text-base">bar_chart</span>
              <span>Statistics</span>
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-muted)]">Total Documents:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{totalDocuments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-muted)]">Current Page:</span>
                <span className="font-semibold text-purple-600 dark:text-purple-400">{currentPage} of {totalPages}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--text-muted)]">Per Page:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{documentsPerPage}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;