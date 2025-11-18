"use client";
import React, { useState, useTransition } from "react";
import { getUIClasses } from "@/styles/colors";
import { updateUserAction, deleteUserAction, generateUserTokenAction, type Permissions, type Role } from "../actions";

const ManageUserForm: React.FC = () => {
  const { inputClasses, buttonClasses } = getUIClasses();
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [updateFields, setUpdateFields] = useState<Partial<{ username: string; email: string; role: Role; password: string; permissions: Permissions }>>({});
  const [managementMsg, setManagementMsg] = useState<string | null>(null);

  return (
    <div className="space-y-4">
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
          <select value={updateFields.role||"user"} onChange={(e)=>setUpdateFields(prev=>({...prev, role: e.target.value as Role}))} className={`w-full px-3 py-2 rounded-lg ${inputClasses}`}>
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
  );
};

export default ManageUserForm;