"use client";
import React from "react";
import type { ButtonClasses } from "../types";
import { PlusCircleIcon, XMarkIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface CreateModalProps {
  cardClasses: string;
  inputClasses: string;
  buttonClasses: ButtonClasses;
  newDocJson: string;
  onChangeNewDoc: (value: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

const CreateModal: React.FC<CreateModalProps> = ({
  cardClasses,
  inputClasses,
  buttonClasses,
  newDocJson,
  onChangeNewDoc,
  onCreate,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className={`w-full max-w-2xl p-6 rounded-lg border ${cardClasses}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-[var(--text)] flex items-center space-x-2">
            <PlusCircleIcon className="w-5 h-5 text-[var(--text-muted)]" />
            <span>Create Document</span>
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700`}
          >
            <XMarkIcon className="w-5 h-5 text-[var(--text)]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text)]">Document JSON:</label>
            <textarea
              className={`w-full p-3 border rounded-xl h-40 font-mono text-sm transition-all duration-200 ${inputClasses}`}
              value={newDocJson}
              onChange={(e) => onChangeNewDoc(e.target.value)}
              placeholder='{"key": "value"}'
            />
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onCreate}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${buttonClasses.purple}`}
            >
              <span className="flex items-center justify-center space-x-2">
                <ArrowDownTrayIcon className="w-4 h-4 text-[var(--on-primary)]" />
                <span>Create Document</span>
              </span>
            </button>
            <button
              onClick={onClose}
              className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${buttonClasses.secondary}`}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;