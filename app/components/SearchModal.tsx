"use client";
import React from "react";
import type { ButtonClasses } from "../types";

interface SearchModalProps {
  darkMode: boolean;
  cardClasses: string;
  inputClasses: string;
  buttonClasses: ButtonClasses;
  searchQuery: string;
  onChangeQuery: (value: string) => void;
  loading: boolean;
  onSearch: () => void;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({
  darkMode,
  cardClasses,
  inputClasses,
  buttonClasses,
  searchQuery,
  onChangeQuery,
  loading,
  onSearch,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-2xl p-6 rounded-lg border ${cardClasses}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center space-x-2">
            <span className="material-symbols-outlined text-[var(--text-muted)] text-base">search</span>
            <span>Search Documents</span>
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors duration-200 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
            >
            <span className="material-symbols-outlined text-[var(--text)] text-base">close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text)]">MongoDB Query (JSON):</label>
            <textarea
              className={`w-full p-3 border rounded-lg h-32 font-mono text-sm transition-colors duration-200 ${inputClasses}`}
              value={searchQuery}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder='{"field": "value"}'
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onSearch}
              disabled={loading}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 ${buttonClasses.primary}`}
            >
              <span className="flex items-center justify-center space-x-2">
                <span className="material-symbols-outlined text-[var(--on-primary)] text-base">search</span>
                <span>Search</span>
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

export default SearchModal;