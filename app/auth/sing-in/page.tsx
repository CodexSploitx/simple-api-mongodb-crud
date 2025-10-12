
"use client";

import { useState, type FormEvent } from "react";
import { getThemeStyles, getUIClasses } from "../../../styles/colors";

const LoginForm = () => {
  // Estado para manejar los inputs del formulario
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const themeStyles = getThemeStyles(darkMode);
  const { themeClasses, cardClasses, inputClasses, buttonClasses } = getUIClasses();

  // Función para manejar el envío del formulario
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    }
  };

  return (
    <div className={`${themeClasses} flex items-center justify-center p-8`} style={themeStyles}>
      <div className={`w-full max-w-md rounded-lg ${cardClasses}`}>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--on-accent)] text-base">lock</span>
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
              <span className="material-symbols-outlined text-[var(--text)] text-base">
                {darkMode ? "light_mode" : "dark_mode"}
              </span>
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

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm text-[var(--text)]" htmlFor="remember-me">
                <input
                  className="h-4 w-4 rounded border-[var(--border)] bg-[var(--surface)]"
                  type="checkbox"
                  name="remember-me"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="text-[var(--text-muted)]">Remember me</span>
              </label>
            </div>

            <button
              className={`w-full py-3 rounded-md font-medium ${buttonClasses.primary}`}
              type="submit"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;