"use client";
import React, { useTransition, useState } from "react";
import { getUIClasses } from "@/styles/colors";
import { verifyAdmin } from "../actions";

interface LoginFormProps {
  onAuthenticated: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onAuthenticated }) => {
  const { inputClasses, buttonClasses } = getUIClasses();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          setLoginError(null);
          const res = await verifyAdmin(formData);
          if (res.ok) onAuthenticated();
          else setLoginError(res.error || "Acceso denegado");
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm mb-1 text-[var(--text)]">Admin User</label>
        <input name="admin_user" type="text" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} placeholder="admin_user" required />
      </div>
      <div>
        <label className="block text-sm mb-1 text-[var(--text)]">Admin Password</label>
        <input name="admin_password" type="password" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} placeholder="admin_password" required />
      </div>
      {loginError && <p className="text-sm text-red-500">{loginError}</p>}
      <button type="submit" className={`w-full px-4 py-2 rounded-lg font-medium ${buttonClasses.primary}`} disabled={isPending}>
        {isPending ? "Verificando..." : "Acceder"}
      </button>
      <p className="text-xs text-[var(--text-muted)]">Las credenciales deben coincidir con .env.local</p>
    </form>
  );
};

export default LoginForm;