"use client";
import React from "react";
import type { ButtonClasses } from "../types";

interface EditModalProps {
  darkMode: boolean;
  cardClasses: string;
  inputClasses: string;
  buttonClasses: ButtonClasses;
  editingDoc: { _id: string } | null;
  newDocJson: string;
  onChangeNewDoc: (value: string) => void;
  onUpdate: () => void;
  onClose: () => void;
}

const EditModal: React.FC<EditModalProps> = ({
  darkMode,
  cardClasses,
  inputClasses,
  buttonClasses,
  editingDoc,
  newDocJson,
  onChangeNewDoc,
  onUpdate,
  onClose,
}) => {
  if (!editingDoc) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-2xl p-6 rounded-lg border ${cardClasses}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center space-x-2">
            <span className="material-symbols-outlined text-[var(--text-muted)] text-base">edit</span>
            <span>Edit Document</span>
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
            <label className="block text-sm font-medium mb-2 text-[var(--text)]">
              Document ID: <code className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{editingDoc._id}</code>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text)]">Document JSON:</label>
            <textarea
              className={`w-full p-3 border rounded-lg h-40 font-mono text-sm transition-colors duration-200 ${inputClasses}`}
              value={newDocJson}
              onChange={(e) => onChangeNewDoc(e.target.value)}
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onUpdate}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${buttonClasses.primary}`}
            >
              <span className="flex items-center justify-center space-x-2">
                <span className="material-symbols-outlined text-[var(--on-primary)] text-base">save</span>
                <span>Update Document</span>
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

export default EditModal;