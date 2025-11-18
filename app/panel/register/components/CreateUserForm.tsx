"use client";
import React, { useState, useTransition } from "react";
import { getUIClasses } from "@/styles/colors";
import { createUserAction, type Permissions } from "../actions";

const CreateUserForm: React.FC = () => {
  const { inputClasses, buttonClasses, cardClasses } = getUIClasses();
  const [isPending, startTransition] = useTransition();
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({ register: true, delete: false, update: false, find: true });
  const [role, setRole] = useState<'admin'|'user'>('user');

  const toggle = (key: keyof Permissions) => {
    if (role === 'admin') return;
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          setCreateMsg(null);
          Object.entries(permissions).forEach(([k, v]) => {
            if (v) formData.set(`perm_${k}`, "on");
            else formData.delete(`perm_${k}`);
          });
          const res = await createUserAction(formData);
          if (res.ok) {
            setCreateMsg(`Usuario creado correctamente${res.insertedId ? ` (ID: ${res.insertedId})` : ""}`);
            setGeneratedToken(res.apiToken || null);
          } else {
            setCreateMsg(res.error || "Error al crear usuario");
            setGeneratedToken(null);
          }
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm mb-1 text-[var(--text)]">Username</label>
        <input name="username" type="text" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} placeholder="usuario" required />
      </div>
      <div>
        <label className="block text-sm mb-1 text-[var(--text)]">Email</label>
        <input name="email" type="email" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} placeholder="correo@dominio.com" required />
      </div>
      <div>
        <label className="block text-sm mb-1 text-[var(--text)]">Password</label>
        <input name="password" type="password" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} placeholder="contraseña" required />
      </div>
      <div>
        <label className="block text-sm mb-1 text-[var(--text)]">Rol</label>
        <select
          name="role"
          className={`w-full px-3 py-2 rounded-lg ${inputClasses}`}
          value={role}
          onChange={(e) => {
            const v = e.target.value as 'admin'|'user';
            setRole(v);
            if (v === 'admin') {
              setPermissions({ register: true, delete: true, update: true, find: true });
            } else {
              setPermissions({ register: true, delete: false, update: false, find: true });
            }
          }}
        >
          <option value="admin">admin</option>
          <option value="user">user</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="block text-sm mb-1 text-[var(--text)]">Permisos {role === 'admin' ? '(bloqueado por rol admin)' : ''}</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={role==='admin'} title={role==='admin' ? 'Admin tiene todos los permisos' : undefined} onClick={() => toggle("register")} className={`px-3 py-2 rounded-lg text-sm border disabled:opacity-50 disabled:cursor-not-allowed ${permissions.register ? buttonClasses.success : buttonClasses.secondary}`}>Registrar</button>
          <button type="button" disabled={role==='admin'} title={role==='admin' ? 'Admin tiene todos los permisos' : undefined} onClick={() => toggle("delete")} className={`px-3 py-2 rounded-lg text-sm border disabled:opacity-50 disabled:cursor-not-allowed ${permissions.delete ? buttonClasses.danger : buttonClasses.secondary}`}>Eliminar</button>
          <button type="button" disabled={role==='admin'} title={role==='admin' ? 'Admin tiene todos los permisos' : undefined} onClick={() => toggle("update")} className={`px-3 py-2 rounded-lg text-sm border disabled:opacity-50 disabled:cursor-not-allowed ${permissions.update ? 'bg-[var(--warning)] text-black border-[var(--warning)]' : buttonClasses.secondary}`}>Actualizar</button>
          <button type="button" disabled={role==='admin'} title={role==='admin' ? 'Admin tiene todos los permisos' : undefined} onClick={() => toggle("find")} className={`px-3 py-2 rounded-lg text-sm border disabled:opacity-50 disabled:cursor-not-allowed ${permissions.find ? buttonClasses.primary : buttonClasses.secondary}`}>Buscar/Leer</button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">{role==='admin' ? 'El rol admin habilita todos los permisos y no se pueden modificar.' : 'Colores por riesgo.'}</p>
      </div>

      {createMsg && <p className={`text-sm ${createMsg.startsWith("Usuario creado") ? "text-emerald-500" : "text-red-500"}`}>{createMsg}</p>}
      {generatedToken && (
        <div className={`p-3 rounded-lg border mt-2 ${cardClasses}`}>
          <p className="text-sm text-[var(--text)]">Token de API generado:</p>
          <code className="block break-words text-xs text-[var(--text-muted)]">{generatedToken}</code>
        </div>
      )}
      <button type="submit" className={`w-full px-4 py-2 rounded-lg font-medium ${buttonClasses.success}`} disabled={isPending}>
        {isPending ? "Creando..." : "Crear Usuario"}
      </button>
      <p className="text-xs text-[var(--text-muted)]">Se insertará en la DB/colección de .env.local</p>
    </form>
  );
};

export default CreateUserForm;