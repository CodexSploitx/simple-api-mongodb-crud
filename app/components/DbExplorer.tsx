"use client";
import React, { useEffect, useState } from "react";
import { getUIClasses } from "../../styles/colors";
import { CircleStackIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type DbMap = Record<string, true>;

interface DbExplorerProps {
  onViewCollection?: (db: string, collection: string) => void;
  onSelectDb?: (db: string) => void;
}

export default function DbExplorer({ onViewCollection, onSelectDb }: DbExplorerProps) {
  const { cardClasses, buttonClasses } = getUIClasses();

  const [databases, setDatabases] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [collectionsByDb, setCollectionsByDb] = useState<Record<string, string[]>>({});
  const [loadingDb, setLoadingDb] = useState<string | null>(null);
  const [expandedDb, setExpandedDb] = useState<string | null>(null);

  useEffect(() => {
    const loadDbs = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/mongodb-list", { cache: "no-store", credentials: "include" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        const json: DbMap = await res.json();
        const names = Object.keys(json).sort();
        setDatabases(names);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    loadDbs();
  }, []);

  const connectDb = async (db: string) => {
    setLoadingDb(db);
    setError(null);
    try {
      // Si ya tenemos las colecciones cargadas, solo seleccionar y abrir panel
      if (collectionsByDb[db]) {
        setExpandedDb(db);
        if (onSelectDb) onSelectDb(db);
        return;
      }

      const res = await fetch(`/api/collections/${encodeURIComponent(db)}`, { cache: "no-store", credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { collections: string[] };
      setCollectionsByDb((prev) => ({ ...prev, [db]: data.collections }));
      setExpandedDb(db);
      if (onSelectDb) {
        onSelectDb(db);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingDb(null);
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${cardClasses}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
            <CircleStackIcon className="w-5 h-5 text-[var(--on-accent)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)]">Databases</h1>
            <p className="text-xs text-[var(--text-muted)]">Select a database to browse collections</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`p-4 rounded-lg border ${cardClasses} animate-pulse`}>
              <div className="h-4 w-1/2 bg-[var(--border)]/60 rounded mb-3" />
              <div className="h-3 w-1/3 bg-[var(--border)]/60 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className={`p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-600 mb-4`}>
          <ExclamationTriangleIcon className="w-5 h-5 align-middle mr-2" />
          <span className="align-middle text-sm">{error}</span>
        </div>
      )}

      {!loading && databases.length === 0 ? (
        <div className={`p-6 rounded-lg border ${cardClasses} text-center`}>
          <div className="w-12 h-12 mx-auto mb-2 bg-[var(--accent)]/15 rounded-full flex items-center justify-center">
            <CircleStackIcon className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-medium text-[var(--text)]">No databases found</h2>
          <p className="text-sm text-[var(--text-muted)]">Create data or check your connection settings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {databases.map((db) => {
              const collections = collectionsByDb[db];
              const isBusy = loadingDb === db;
              return (
                <li key={db} className={`rounded-lg border ${cardClasses}`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text)]">{db}</span>
                        {collections && (
                          <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full border bg-[var(--surface)] text-[var(--text-muted)]">
                            {collections.length} collections
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => connectDb(db)}
                          className={`px-3 py-1 rounded-md text-xs ${buttonClasses.primary}`}
                          disabled={isBusy}
                          title={collections ? "Connect" : "Load collections"}
                        >
                          {isBusy ? "Loading..." : "Connect"}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className={`rounded-lg border ${cardClasses} p-4 min-h-[180px]`}>
            {expandedDb ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-[var(--text)]">{expandedDb}</h2>
                  <button
                    className={`px-2 py-1 rounded-md text-xs ${buttonClasses.secondary}`}
                    onClick={() => setExpandedDb(null)}
                  >
                    Close
                  </button>
                </div>
                <p className="text-sm text-[var(--text-muted)] mb-2">Collections</p>
                <ul className="space-y-2 max-h-64 overflow-auto">
                  {collectionsByDb[expandedDb]?.map((col) => (
                    <li key={col} className="flex items-center justify-between">
                      <span className="text-[var(--text)]">{col}</span>
                      <button
                        className={`px-2 py-1 rounded-lg text-xs border ${buttonClasses.secondary}`}
                        onClick={() => onViewCollection?.(expandedDb!, col)}
                      >
                        View Collection
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <span className="text-sm text-[var(--text-muted)]">Select a database to view its collections</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}