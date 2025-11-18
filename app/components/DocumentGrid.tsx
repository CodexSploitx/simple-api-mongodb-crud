"use client";
import React from "react";
import type { ButtonClasses } from "../types";

interface DocumentType {
  _id: string;
  [key: string]: unknown;
}

interface DocumentGridProps {
  documents: DocumentType[];
  darkMode: boolean;
  cardClasses: string;
  buttonClasses: ButtonClasses;
  onEdit: (doc: DocumentType) => void;
  onDelete: (id: string) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
  disableReasonUpdate?: string;
  disableReasonDelete?: string;
  onViewFull?: (doc: DocumentType) => void;
}

const DocumentGrid: React.FC<DocumentGridProps> = ({
  documents,
  darkMode,
  cardClasses,
  buttonClasses,
  onEdit,
  onDelete,
  canUpdate = true,
  canDelete = true,
  disableReasonUpdate,
  disableReasonDelete,
  onViewFull,
}) => {
  const MAX_CHARS = 800;
  const MAX_LINES = 30;
  const MAX_LINE_LENGTH = 160;

  const makePreview = (doc: DocumentType) => {
    const full = JSON.stringify(doc, null, 2);
    const lines = full.split("\n");
    let truncated = false;

    const croppedLines = lines.slice(0, MAX_LINES).map((l) => {
      if (l.length > MAX_LINE_LENGTH) {
        truncated = true;
        return l.slice(0, MAX_LINE_LENGTH) + "…";
      }
      return l;
    });

    let preview = croppedLines.join("\n");
    if (full.length > MAX_CHARS) {
      truncated = true;
      preview = preview.slice(0, MAX_CHARS) + "\n…";
    }
    if (lines.length > MAX_LINES) {
      truncated = true;
      preview += "\n…";
    }
    return { preview, truncated, full };
  };

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc._id as string}
          className={`p-4 border rounded-lg transition-colors duration-200 hover:border-gray-300 dark:hover:border-gray-600 ${cardClasses} relative`}
        >
          <div className="flex flex-col sm:flex-row justify-between items-start mb-3 space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 rounded flex items-center justify-center bg-[var(--accent)]">
                <span className="material-symbols-outlined text-[var(--on-accent)] text-[14px] leading-none">description</span>
              </div>
              <code className="text-xs font-mono px-2 py-1 bg-[var(--surface)] text-[var(--text)] rounded">
                ID: {String(doc._id)}
              </code>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => { if (!canUpdate) return; onEdit(doc); }}
                disabled={!canUpdate}
                title={!canUpdate ? (disableReasonUpdate || "You don't have permission to update documents") : undefined}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
              >
                <span className="flex items-center space-x-1">
                  <span className="material-symbols-outlined text-[var(--text)] text-[14px] leading-none">edit</span>
                  <span>Edit</span>
                </span>
              </button>
              <button
                onClick={() => { if (!canDelete) return; onDelete(String(doc._id)); }}
                disabled={!canDelete}
                title={!canDelete ? (disableReasonDelete || "You don't have permission to delete documents") : undefined}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.danger}`}
              >
                <span className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </span>
              </button>
            </div>
          </div>

          {(() => {
            const { preview, truncated } = makePreview(doc);
            return (
              <div>
                <pre
                  className={`text-xs p-3 rounded border ${
                    darkMode ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
                  } max-h-40 overflow-hidden`}
                >
                  {preview}
                </pre>
                <div className="absolute bottom-3 right-3">
                  <button
                    onClick={() => onViewFull && onViewFull(doc)}
                    className={`px-2 py-1 rounded text-[10px] ${buttonClasses.secondary}`}
                    title="View the full document"
                  >
                    View Full Content
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
};

export default DocumentGrid;