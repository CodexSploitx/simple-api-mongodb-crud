"use client";

import { useEffect, useMemo, useState } from "react";
import type { UserRecord, DeleteUserResponse } from "../types";

type DeleteMode = "delete_all" | "delete_some" | "keep_all_delete_only_auth";

interface TargetSelection {
  db: string;
  collections: string[];
  fields: ("ownerId" | "userId")[];
}

interface DeleteUserOptions {
  mode: DeleteMode;
  targets?: TargetSelection[];
  archive?: boolean;
  fields?: { ownerId: boolean; userId: boolean };
}

interface DeleteUserModalProps {
  isOpen: boolean;
  user: UserRecord | null;
  onClose: () => void;
  onConfirm: (options: DeleteUserOptions) => Promise<DeleteUserResponse>;
  onResult?: (res: DeleteUserResponse) => void;
}

export default function DeleteUserModal({ isOpen, user, onClose, onConfirm }: DeleteUserModalProps) {
  const [mode, setMode] = useState<DeleteMode>("delete_all");
  const [databases, setDatabases] = useState<string[]>([]);
  const [loadingDbs, setLoadingDbs] = useState(false);
  const [dbCollections, setDbCollections] = useState<Record<string, string[]>>({});
  const [selectedTargets, setSelectedTargets] = useState<Record<string, TargetSelection>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DeleteUserResponse | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    setLoadingDbs(true);
    fetch("/api/mongodb-list", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        const names = Object.keys(json || {}).filter(Boolean);
        setDatabases(names);
      })
      .catch(() => {})
      .finally(() => setLoadingDbs(false));
  }, [isOpen]);

  const loadCollections = async (db: string) => {
    if (dbCollections[db]) return;
    try {
      const uid = user?._id || "";
      const r = await fetch(`/api/mongodb-collections?db=${encodeURIComponent(db)}${uid ? `&userId=${encodeURIComponent(uid)}` : ""}`, { credentials: "include" });
      const json = await r.json();
      const cols: string[] = Array.isArray(json?.collections) ? json.collections : [];
      setDbCollections((prev) => ({ ...prev, [db]: cols }));
    } catch {}
  };

  const selectedTargetsArray: TargetSelection[] = useMemo(() => Object.values(selectedTargets), [selectedTargets]);
  const hasSomeSelection = useMemo(() => selectedTargetsArray.some((t) => t.collections.length > 0), [selectedTargetsArray]);

  const toggleDbSelection = (db: string, checked: boolean) => {
    if (!checked) {
      setSelectedTargets((prev) => {
        const rest = { ...prev };
        delete rest[db];
        return rest;
      });
      return;
    }
    loadCollections(db);
    setSelectedTargets((prev) => ({
      ...prev,
      [db]: { db, collections: [], fields: ["ownerId", "userId"] },
    }));
  };

  const toggleCollectionSelection = (db: string, col: string, checked: boolean) => {
    setSelectedTargets((prev) => {
      const t = prev[db];
      if (!t) return prev;
      const set = new Set(t.collections);
      if (checked) set.add(col);
      else set.delete(col);
      return { ...prev, [db]: { ...t, collections: Array.from(set) } };
    });
  };


  const confirm = async () => {
    if (!user) return;
    if (mode === "delete_some" && !hasSomeSelection) {
      return;
    }
    let opts: DeleteUserOptions;
    if (mode === "delete_all") {
      opts = { mode, archive: false, fields: { ownerId: true, userId: true } };
    } else if (mode === "keep_all_delete_only_auth") {
      opts = { mode, archive: true };
    } else {
      opts = { mode, targets: selectedTargetsArray, archive: true };
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await onConfirm(opts);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl w-full max-w-3xl mx-4 p-6">
        <h3 className="text-xl font-semibold text-[var(--text)] mb-3">Delete User</h3>
        <p className="text-[var(--text-muted)] mb-4">Select how to proceed with related data for &quot;{user.username}&quot;.</p>

        {!result && (
        <div className="space-y-3 mb-4">
          <label className="flex items-center gap-2">
            <input type="radio" name="delete_mode" checked={mode === "delete_all"} onChange={() => setMode("delete_all")} />
            <span className="text-[var(--text)]">Delete all in all databases and collections where related records exist</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="delete_mode" checked={mode === "delete_some"} onChange={() => setMode("delete_some")} />
            <span className="text-[var(--text)]">Delete only in selected databases and collections</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="delete_mode" checked={mode === "keep_all_delete_only_auth"} onChange={() => setMode("keep_all_delete_only_auth")} />
            <span className="text-[var(--text)]">Keep all, delete only in Auth-Client (archive user)</span>
          </label>
        </div>
        )}

        {!result && mode === "delete_all" && (
          <div className="mb-4"></div>
        )}

        {!result && mode === "delete_some" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="border border-[var(--border)] rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-[var(--text)]">Bases de datos</div>
                {loadingDbs && <div className="text-xs text-[var(--text-muted)]">Cargando...</div>}
              </div>
              <div className="max-h-56 overflow-auto space-y-1">
                {databases.map((db) => (
                  <label key={db} className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(selectedTargets[db])} onChange={(e) => toggleDbSelection(db, e.target.checked)} />
                    <span className="text-[var(--text)]">{db}</span>
                  </label>
                ))}
                {databases.length === 0 && <div className="text-sm text-[var(--text-muted)]">No databases available</div>}
              </div>
            </div>
            <div className="border border-[var(--border)] rounded-md p-3">
              <div className="text-sm font-medium text-[var(--text)] mb-2">Collections</div>
              <div className="max-h-56 overflow-auto space-y-3">
                {Object.keys(selectedTargets).length === 0 && (
                  <div className="text-sm text-[var(--text-muted)]">Select a database to view collections</div>
                )}
                {Object.entries(selectedTargets).map(([db, sel]) => (
                  <div key={db}>
                    <div className="text-xs text-[var(--text-muted)] mb-1">{db}</div>
                    <div className="flex items-center gap-4 mb-2"></div>
                    <div className="grid grid-cols-2 gap-2">
                      {(dbCollections[db] || []).map((col) => (
                        <label key={`${db}:${col}`} className="flex items-center gap-2">
                          <input type="checkbox" checked={sel.collections.includes(col)} onChange={(e) => toggleCollectionSelection(db, col, e.target.checked)} />
                          <span className="text-[var(--text)]">{col}</span>
                        </label>
                      ))}
                    </div>
                    {!hasSomeSelection && (
                      <div className="text-xs text-[var(--warning)] mt-2">Select at least one collection</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-[var(--text-muted)]">This mode will archive the user before deleting in the selected collections.</div>
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4">
            <div className="text-sm text-[var(--text)]">Result</div>
            <div className="text-sm text-[var(--text-muted)] mb-2">{result.success ? (result.message || "Operation completed") : (result.error || result.message || "Error in operation")}</div>
            {typeof result.totalDeleted === "number" && (
              <div className="text-sm text-[var(--text)] mb-2">Total deleted: {result.totalDeleted}</div>
            )}
            {result.archived && (
              <div className="text-sm text-[var(--text)] mb-2">User archived</div>
            )}
            {Array.isArray(result.deletedByCollection) && result.deletedByCollection.length > 0 && (
              <div className="max-h-56 overflow-auto border border-[var(--border)] rounded-md p-3">
                {result.deletedByCollection.map((r, i) => (
                  <div key={`${r.db}:${r.collection}:${i}`} className="text-xs text-[var(--text-muted)]">
                    {r.db}.{r.collection}: {r.deletedCount}
                  </div>
                ))}
              </div>
            )}
            {error && (
              <div className="mt-2 text-sm text-red-500">{error}</div>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-[var(--surface)] hover:bg-[var(--border)] text-[var(--text)] border border-[var(--border)] transition-colors">{result ? "Cerrar" : "Cancelar"}</button>
          {!result && (
            <button
              onClick={confirm}
              disabled={submitting || (mode === "delete_some" && !hasSomeSelection)}
              className="px-4 py-2 rounded-md bg-[var(--danger)] hover:bg-red-600 text-white disabled:opacity-50"
              title={mode === "delete_some" && !hasSomeSelection ? "Select at least one collection" : mode === "delete_some" ? "User will be archived before deleting in the selected collections" : undefined}
            >
              {submitting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
