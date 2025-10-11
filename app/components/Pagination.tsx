"use client";
import React from "react";
import type { ButtonClasses } from "../types";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buttonClasses: ButtonClasses;
  onPageChange: (page: number) => void;
  variant?: "compact" | "full";
  darkMode?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  buttonClasses,
  onPageChange,
  variant = "full",
  darkMode = false,
}) => {
  if (totalPages <= 1) return null;

  if (variant === "compact") {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="px-3 py-2 text-sm font-medium text-[var(--text)]">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
      >
        First
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
      >
        Previous
      </button>

      <span
        className={`px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 ${
          darkMode ? "bg-gray-800" : "bg-gray-100"
        } rounded-lg`}
      >
        {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
      >
        Next
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
      >
        Last
      </button>
    </div>
  );
};

export default Pagination;