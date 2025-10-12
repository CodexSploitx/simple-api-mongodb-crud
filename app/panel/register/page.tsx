"use client";

import { useState, useTransition } from "react";
import { getThemeStyles, getUIClasses } from "@/styles/colors";
import { verifyAdmin, createUserAction, updateUserAction, deleteUserAction, generateUserTokenAction, type Permissions } from './actions';

export default function AdminRegisterPanel() {
  const [darkMode, setDarkMode] = useState(true);
  const themeStyles = getThemeStyles(darkMode);
  const { themeClasses, cardClasses, inputClasses, buttonClasses } = getUIClasses();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [managementMsg, setManagementMsg] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [updateFields, setUpdateFields] = useState<{ username?: string; email?: string; role?: 'admin' | 'user'; password?: string }>({});
  const [isPending, startTransition] = useTransition();
  const [permissions, setPermissions] = useState<Permissions>({
    register: true,
    delete: false,
    update: false,
    find: true,
  });

  const togglePerm = (key: keyof Permissions) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
            <form
              action={(formData) => {
                startTransition(async () => {
                  setLoginError(null);
                  const res = await verifyAdmin(formData);
                  if (res.ok) {
                    setIsAuthenticated(true);
                  } else {
                    setLoginError(res.error || "Acceso denegado");
                  }
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
              {loginError && (
                <p className="text-sm text-red-500">{loginError}</p>
              )}
              <button type="submit" className={`w-full px-4 py-2 rounded-lg font-medium ${buttonClasses.primary}`} disabled={isPending}>
                {isPending ? "Verificando..." : "Acceder"}
              </button>
              <p className="text-xs text-[var(--text-muted)]">Las credenciales deben coincidir con .env.local</p>
            </form>
          ) : (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Crear Usuario</h2>
              <form
                action={(formData) => {
                  startTransition(async () => {
                    setCreateMsg(null);
                    // Append permissions to formData using boolean presence for server action
                    Object.entries(permissions).forEach(([k, v]) => {
                      if (v) formData.set(`perm_${k}`, 'on');
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
                  <select name="role" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} defaultValue="user">
                    <option value="admin">admin</option>
                    <option value="user">user</option>
                  </select>
                </div>
                {/* Permission toggles */}
                <div className="space-y-2">
                  <label className="block text-sm mb-1 text-[var(--text)]">Permisos</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => togglePerm('register')} className={`px-3 py-2 rounded-lg text-sm border ${permissions.register ? buttonClasses.success : buttonClasses.secondary}`}>
                      Registrar
                    </button>
                    <button type="button" onClick={() => togglePerm('delete')} className={`px-3 py-2 rounded-lg text-sm border ${permissions.delete ? buttonClasses.danger : buttonClasses.secondary}`}>
                      Eliminar
                    </button>
                    <button type="button" onClick={() => togglePerm('update')} className={`px-3 py-2 rounded-lg text-sm border ${permissions.update ? 'bg-[var(--warning)] text-black border-[var(--warning)]' : buttonClasses.secondary}`}>
                      Actualizar
                    </button>
                    <button type="button" onClick={() => togglePerm('find')} className={`px-3 py-2 rounded-lg text-sm border ${permissions.find ? buttonClasses.primary : buttonClasses.secondary}`}>
                      Buscar/Leer
                    </button>
                    {/* Removed 'Otras' permission as requested */}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">Colores por riesgo: eliminar en rojo, actualizar en amarillo, normales en neutros.</p>
                </div>

                {createMsg && (
                  <p className={`text-sm ${createMsg.startsWith("Usuario creado") ? "text-emerald-500" : "text-red-500"}`}>{createMsg}</p>
                )}
                {generatedToken && (
                  <div className="p-3 rounded-lg border mt-2">
                    <p className="text-sm text-[var(--text)]">Token de API generado (muéstralo al usuario ahora, no se vuelve a mostrar):</p>
                    <code className="block break-words text-xs text-[var(--text-muted)]">{generatedToken}</code>
                  </div>
                )}
                <button type="submit" className={`w-full px-4 py-2 rounded-lg font-medium ${buttonClasses.success}`} disabled={isPending}>
                  {isPending ? "Creando..." : "Crear Usuario"}
                </button>
                <p className="text-xs text-[var(--text-muted)]">Se insertará en la DB y colección definidas en .env.local</p>
              </form>

              {/* Gestión de usuarios */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Gestión de Usuarios</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm mb-1 text-[var(--text)]">ID de Usuario</label>
                    <input value={selectedUserId} onChange={(e)=>setSelectedUserId(e.target.value)} type="text" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} placeholder="_id del usuario" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm mb-1 text-[var(--text)]">Nuevo Username</label>
                      <input value={updateFields.username||""} onChange={(e)=>setUpdateFields(prev=>({...prev, username:e.target.value}))} type="text" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} placeholder="nuevo usuario" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-[var(--text)]">Nuevo Email</label>
                      <input value={updateFields.email||""} onChange={(e)=>setUpdateFields(prev=>({...prev, email:e.target.value}))} type="email" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} placeholder="correo@dominio.com" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-[var(--text)]">Nuevo Rol</label>
                      <select value={updateFields.role||"user"} onChange={(e)=>setUpdateFields(prev=>({...prev, role: e.target.value as 'admin'|'user'}))} className={`w-full px-3 py-2 rounded-lg ${inputClasses}`}>
                        <option value="admin">admin</option>
                        <option value="user">user</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-[var(--text)]">Nuevo Password</label>
                      <input value={updateFields.password||""} onChange={(e)=>setUpdateFields(prev=>({...prev, password:e.target.value}))} type="password" className={`w-full px-3 py-2 rounded-lg ${inputClasses}`} placeholder="contraseña" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={()=>{
                        startTransition(async()=>{
                          setManagementMsg(null);
                          if (!selectedUserId) { setManagementMsg('Ingresa el ID de usuario'); return; }
                          const res = await updateUserAction({ id: selectedUserId, data: updateFields });
                          if (res.ok) setManagementMsg(`Actualizado: ${res.modifiedCount} documento(s)`);
                          else setManagementMsg(res.error||'Error al actualizar');
                        });
                      }}
                      className={`px-3 py-2 rounded-lg text-sm ${buttonClasses.warning}`}
                    >Actualizar Usuario</button>
                    <button
                      type="button"
                      onClick={()=>{
                        startTransition(async()=>{
                          setManagementMsg(null);
                          if (!selectedUserId) { setManagementMsg('Ingresa el ID de usuario'); return; }
                          const res = await deleteUserAction({ id: selectedUserId });
                          if (res.ok) setManagementMsg(`Eliminado: ${res.deletedCount} documento(s)`);
                          else setManagementMsg(res.error||'Error al eliminar');
                        });
                      }}
                      className={`px-3 py-2 rounded-lg text-sm ${buttonClasses.danger}`}
                    >Eliminar Usuario</button>
                    <button
                      type="button"
                      onClick={()=>{
                        startTransition(async()=>{
                          setManagementMsg(null);
                          if (!selectedUserId) { setManagementMsg('Ingresa el ID de usuario'); return; }
                          const res = await generateUserTokenAction({ id: selectedUserId });
                          if (res.ok) setManagementMsg(`Nuevo token generado`);
                          else setManagementMsg(res.error||'Error al regenerar token');
                        });
                      }}
                      className={`px-3 py-2 rounded-lg text-sm ${buttonClasses.secondary}`}
                    >Regenerar Token</button>
                  </div>
                  {managementMsg && <p className="text-sm text-[var(--text)]">{managementMsg}</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}