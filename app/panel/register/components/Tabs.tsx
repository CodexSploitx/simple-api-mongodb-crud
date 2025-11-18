"use client";
import React from "react";
import { getUIClasses } from "@/styles/colors";

type Tab = { key: string; label: string; icon?: string };

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, active, onChange }) => {
  const { buttonClasses } = getUIClasses();
  return (
    <div className="flex gap-2 mb-4">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-3 py-2 rounded-lg text-sm ${active === t.key ? buttonClasses.primary : buttonClasses.secondary}`}
          title={t.label}
        >
          <span className="flex items-center gap-2">
            {t.icon && <span className="material-symbols-outlined text-[var(--on-primary)] text-[16px]">{t.icon}</span>}
            <span>{t.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
};

export default Tabs;