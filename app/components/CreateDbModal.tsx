"use client";
import React from "react";
import type { ButtonClasses } from "../types";

interface CreateDbModalProps {
  cardClasses: string;
  inputClasses: string;
  buttonClasses: ButtonClasses;
  message: string;
  newDbName: string;
  newCollectionName: string;
  loading: boolean;
  onChangeDbName: (value: string) => void;
  onChangeCollectionName: (value: string) => void;
  onCreate: () => void;
  onClose: () => void;
  canCreateDbCollection?: boolean;
  disableReasonCreateDb?: string;
}

const CreateDbModal: React.FC<CreateDbModalProps> = ({
  cardClasses,
  inputClasses,
  buttonClasses,
  message,
  newDbName,
  newCollectionName,
  loading,
  onChangeDbName,
  onChangeCollectionName,
  onCreate,
  onClose,
  canCreateDbCollection = true,
  disableReasonCreateDb,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-md p-6 rounded-lg border ${cardClasses}`}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-[var(--surface)] rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-[var(--text)] text-2xl">database</span>
          </div>
          <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Create Database/Collection</h3>
          <p className="text-sm text-[var(--text-muted)]">{message}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text)]">Database Name:</label>
            <input
              type="text"
              className={`w-full p-3 border rounded-lg transition-colors duration-200 ${inputClasses}`}
              value={newDbName}
              onChange={(e) => onChangeDbName(e.target.value)}
              placeholder="Enter database name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text)]">Collection Name:</label>
            <input
              type="text"
              className={`w-full p-3 border rounded-lg transition-colors duration-200 ${inputClasses}`}
              value={newCollectionName}
              onChange={(e) => onChangeCollectionName(e.target.value)}
              placeholder="Enter collection name"
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => { if (!canCreateDbCollection) return; onCreate(); }}
              disabled={loading || !canCreateDbCollection}
              title={!canCreateDbCollection ? (disableReasonCreateDb || "Only admins can create databases/collections") : undefined}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.primary}`}
            >
              <span className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9" />
                </svg>
                <span>Create</span>
              </span>
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateDbModal;