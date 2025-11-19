
"use client";

import { useState, type FormEvent } from "react";
import { getThemeStyles, getUIClasses } from "../../../styles/colors";
import { LockClosedIcon, SunIcon, MoonIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const LoginForm = () => {
  // Estado para manejar los inputs del formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const themeStyles = getThemeStyles(darkMode);
  const { themeClasses, cardClasses, inputClasses, buttonClasses } = getUIClasses();

  // Función para manejar el envío del formulario
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (resp.ok && data?.success) {
        // Cookie HttpOnly se establece desde el servidor; solo redirigimos
        window.location.href = '/';
      } else {
        alert(data?.message || 'Error de autenticación');
      }
    } catch (err) {
      console.error('Login error', err);
      alert('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${themeClasses} flex items-center justify-center p-8`} style={themeStyles}>
      <div className={`w-full max-w-md rounded-lg ${cardClasses}`}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <LockClosedIcon className="w-5 h-5 text-[var(--on-accent)]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--text)]">Sign In</h2>
                <p className="text-sm text-[var(--text-muted)]">Access MongoDB Admin</p>
              </div>
            </div>
            <button
              onClick={() => setDarkMode((v) => !v)}
              className={`p-2 rounded-lg ${buttonClasses.secondary}`}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? (
                <SunIcon className="w-4 h-4 text-[var(--text)]" />
              ) : (
                <MoonIcon className="w-4 h-4 text-[var(--text)]" />
              )}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text)]" htmlFor="email">
                Email
              </label>
              <input
                className={`w-full p-3 rounded-md ${inputClasses}`}
                required
                autoComplete="email"
                type="email"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text)]" htmlFor="password">
                Password
              </label>
              <input
                className={`w-full p-3 rounded-md ${inputClasses}`}
                required
                autoComplete="current-password"
                type="password"
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <button
              className={`w-full py-3 rounded-md font-medium ${buttonClasses.primary} disabled:opacity-50 disabled:cursor-not-allowed`}
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <ArrowPathIcon className="w-4 h-4 animate-spin text-[var(--on-primary)]" />
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;