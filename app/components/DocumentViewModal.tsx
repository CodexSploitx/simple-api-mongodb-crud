"use client";
import React, { useMemo, useState } from "react";
import type { ButtonClasses } from "../types";
import { EyeIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface DocumentType {
  _id: string;
  [key: string]: unknown;
}

interface DocumentViewModalProps {
  darkMode: boolean;
  cardClasses: string;
  buttonClasses: ButtonClasses;
  doc: DocumentType | null;
  onClose: () => void;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const buildRegex = (query: string, exact: boolean, caseSensitive: boolean) => {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = exact ? `\\b${escaped}\\b` : escaped;
  return new RegExp(source, caseSensitive ? "g" : "gi");
};

const DocumentViewModal: React.FC<DocumentViewModalProps> = ({
  darkMode,
  cardClasses,
  buttonClasses,
  doc,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [exact, setExact] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  if (!doc) return null;

  const jsonText = useMemo(() => JSON.stringify(doc, null, 2), [doc]);

  const { highlightedHtml, matchCount } = useMemo(() => {
    const base = escapeHtml(jsonText);
    if (!query.trim()) return { highlightedHtml: base, matchCount: 0 };
    const re = buildRegex(query.trim(), exact, caseSensitive);
    let count = 0;
    const html = base.replace(re, (m) => {
      count += 1;
      return `<mark class="px-1 rounded bg-yellow-300 text-black">${m}</mark>`;
    });
    return { highlightedHtml: html, matchCount: count };
  }, [jsonText, query, exact, caseSensitive]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-4xl p-6 rounded-lg border ${cardClasses}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center space-x-2">
            <EyeIcon className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Full Document</span>
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors duration-200 ${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
          >
            <XMarkIcon className="w-5 h-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search within the document"
              className={`w-full px-3 py-2 rounded-lg text-sm border ${darkMode ? "bg-gray-900 border-gray-700 text-gray-200" : "bg-white border-gray-300 text-gray-800"}`}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[var(--text)] flex items-center gap-2">
              <input type="checkbox" checked={exact} onChange={(e) => setExact(e.target.checked)} />
              Exact match
            </label>
            <label className="text-xs text-[var(--text)] flex items-center gap-2">
              <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
              Case sensitive
            </label>
            <span className="text-xs text-[var(--text-muted)]">{matchCount} matches</span>
          </div>
        </div>

        <div className={`rounded border ${darkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"} max-h-[70vh] overflow-auto`}> 
          <pre
            className={`text-xs p-4 min-w-[600px] ${darkMode ? "text-gray-200" : "text-gray-800"}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className={`px-4 py-2 rounded-lg font-medium ${buttonClasses.secondary}`}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewModal;