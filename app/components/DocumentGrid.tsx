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
}

const DocumentGrid: React.FC<DocumentGridProps> = ({
  documents,
  darkMode,
  cardClasses,
  buttonClasses,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <div
          key={doc._id as string}
          className={`p-4 border rounded-lg transition-colors duration-200 hover:border-gray-300 dark:hover:border-gray-600 ${cardClasses}`}
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
                onClick={() => onEdit(doc)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
              >
                <span className="flex items-center space-x-1">
                  <span className="material-symbols-outlined text-[var(--text)] text-[14px] leading-none">edit</span>
                  <span>Edit</span>
                </span>
              </button>
              <button
                onClick={() => onDelete(String(doc._id))}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${buttonClasses.danger}`}
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

          <pre
            className={`text-xs overflow-x-auto p-3 rounded border ${
              darkMode ? "bg-gray-900 border-gray-700 text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"
            }`}
          >
            {JSON.stringify(doc, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
};

export default DocumentGrid;