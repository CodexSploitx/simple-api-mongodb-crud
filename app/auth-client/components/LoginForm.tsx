"use client";

import { useState } from "react";
import { adminLogin, saveSession, adminRequestOtp, adminVerifyOtp } from "../utils/adminAuth";

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"password"|"otp">("password");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    if (tab === "password") {
      const result = await adminLogin(username, password);
      setLoading(false);
      if (result.success && result.token) { saveSession(result.token); onLoginSuccess(); } else { setError(result.error || "Login failed"); }
    } else {
      const result = await adminVerifyOtp(email, code);
      setLoading(false);
      if (result.success && result.token) { saveSession(result.token); onLoginSuccess(); } else { setError(result.error || "OTP login failed"); }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">Auth Client Admin</h1>
          <p className="text-[var(--text-muted)]">Sign in to manage users</p>
        </div>

        <div className="flex gap-4 mb-4 border-b border-[var(--border)]">
          <button type="button" onClick={()=>setTab("password")} className={`px-2 py-1 text-sm ${tab==='password' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>Password</button>
          <button type="button" onClick={()=>setTab("otp")} className={`px-2 py-1 text-sm ${tab==='otp' ? 'text-[var(--text)] border-b-2 border-[var(--primary)]' : 'text-[var(--text-muted)]'}`}>Email OTP</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            {tab === "password" ? (
              <>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Username</label>
                <input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none" placeholder="Enter username" required />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-[var(--text)] mb-1">Admin email</label>
                <div className="flex gap-2">
                  <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="flex-1 px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none" placeholder="admin@example.com" required />
                  <button type="button" onClick={async()=>{ setError(""); const r = await adminRequestOtp(email); if (!r.success) setError(r.error || "Failed to send code"); }} className="px-3 py-2 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--text)]">Enviar código</button>
                </div>
              </>
            )}
          </div>

          {tab === "password" ? (
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Password</label>
              <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none" placeholder="Enter password" required />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-1">Código OTP</label>
              <input type="text" value={code} onChange={(e)=>setCode(e.target.value)} className="w-full px-3 py-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] outline-none" placeholder="000000" required />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          <button type="submit" className="w-full px-4 py-2 rounded-md bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium transition-colors disabled:opacity-50" disabled={loading}>
            {loading ? (tab==='password' ? "Signing in..." : "Verifying...") : (tab==='password' ? "Sign In" : "Verify & Sign In")}
          </button>
        </form>
      </div>
    </div>
  );
}
