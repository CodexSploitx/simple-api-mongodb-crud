"use client";
import React from "react";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="max-w-md w-full p-6 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Something went wrong</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {error?.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}