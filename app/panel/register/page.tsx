"use client";

import { useState, useTransition } from "react";
import { getThemeStyles, getUIClasses } from "@/styles/colors";
import { verifyAdmin, type Permissions } from './actions';
import Tabs from './components/Tabs';
import { UserPlusIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import LoginForm from './components/LoginForm';
import CreateUserForm from './components/CreateUserForm';
import ManageUserForm from './components/ManageUserForm';

export default function AdminRegisterPanel() {
  const [darkMode, setDarkMode] = useState(true);
  const themeStyles = getThemeStyles(darkMode);
  const { themeClasses, cardClasses, inputClasses, buttonClasses } = getUIClasses();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'create'|'manage'>('create');

  return (
    <div className={themeClasses} style={themeStyles as React.CSSProperties}>
      <div className="container mx-auto max-w-xl py-10 px-4">
        <div className={`p-6 rounded-lg border ${cardClasses}`}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-[var(--text)]">Panel Admin</h1>
            <button
              onClick={() => setDarkMode((d) => !d)}
              className={`px-3 py-2 rounded-lg text-sm ${buttonClasses.secondary}`}
            >
              {darkMode ? "Light" : "Dark"}
            </button>
          </div>

          {!isAuthenticated ? (
            <LoginForm onAuthenticated={() => setIsAuthenticated(true)} />
          ) : (
            <div>
              <Tabs
                tabs={[
                  { key: 'create', label: 'Registrar', icon: <UserPlusIcon className="w-4 h-4" /> },
                  { key: 'manage', label: 'Gestionar', icon: <Cog6ToothIcon className="w-4 h-4" /> },
                ]}
                active={activeTab}
                onChange={(k)=>setActiveTab(k as 'create'|'manage')}
              />
              {activeTab === 'create' && (
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Crear Usuario</h2>
                  <CreateUserForm />
                </div>
              )}
              {activeTab === 'manage' && (
                <div className="mt-2">
                  <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Gestión de Usuarios</h2>
                  <ManageUserForm />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}