'use server';

import { insertOneWithDynamicDB, updateOneDocument, deleteOneDocument, findOneDocument } from '@/services/crudService';
import type { Document as MongoDoc } from 'mongodb';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { headers } from 'next/headers';
import type { InsertOneResult, Document } from 'mongodb';

export type Role = 'admin' | 'user';
export type PermissionKey = 'register' | 'delete' | 'update' | 'find' | 'authClientAccess';
export type Permissions = Record<PermissionKey, boolean>;

type RateRecord = { attempts: number; windowStart: number; lockedUntil?: number };

const getRateStore = (): Map<string, RateRecord> => {
  const g = globalThis as unknown as { __adminRateStore?: Map<string, RateRecord> };
  if (!g.__adminRateStore) g.__adminRateStore = new Map<string, RateRecord>();
  return g.__adminRateStore;
};

export async function verifyAdmin(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  // Rate limiting y lockout en memoria (para producción usar Redis/KV compartido)
  const numFromEnv = (name: string, def: number, min: number = 0): number => {
    const raw = process.env[name];
    const n = raw !== undefined ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= min ? n : def;
  };

  const RATE_LIMIT_WINDOW_MS = numFromEnv('RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000, 1000); // 10 minutos por defecto
  const RATE_LIMIT_MAX_ATTEMPTS = numFromEnv('RATE_LIMIT_MAX_ATTEMPTS', 8, 1); // 8 intentos por defecto
  const LOCKOUT_MS = numFromEnv('LOCKOUT_MS', 15 * 60 * 1000, 1000); // 15 minutos por defecto
  const RATE_LIMIT_JITTER_BASE_MS = numFromEnv('RATE_LIMIT_JITTER_BASE_MS', 80, 0); // 80ms base por defecto
  const RATE_LIMIT_JITTER_VARIATION_MS = numFromEnv('RATE_LIMIT_JITTER_VARIATION_MS', 70, 0); // hasta +70ms por defecto

  const rateStore = getRateStore();

  const getClientKey = async (): Promise<string> => {
    try {
      const h = await headers();
      const ip = h.get('x-forwarded-for') || h.get('x-real-ip') || '';
      return ip ? `ip:${ip.split(',')[0].trim()}` : 'global';
    } catch {
      return 'global';
    }
  };

  const now = Date.now();
  const key = await getClientKey();
  const rec = rateStore.get(key);
  if (rec?.lockedUntil && now < rec.lockedUntil) {
    const minsLeft = Math.ceil((rec.lockedUntil - now) / 60000);
    return { ok: false, error: `Demasiados intentos. Vuelve a intentar en ~${minsLeft} min.` };
  }

  // Lectura de credenciales
  const adminUserInput = String(formData.get('admin_user') || '').trim();
  const adminPassInput = String(formData.get('admin_password') || '').trim();

  const ADMIN_USER = process.env.ADMIN_USER || process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || '';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASS || '';

  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    return { ok: false, error: 'Variables de entorno ADMIN_USER y ADMIN_PASSWORD faltan en .env.local' };
  }

  // Comparación en tiempo constante (evitar fugas por timing)
  const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest();
  const timingSafeEq = (a: Buffer, b: Buffer) => {
    try {
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  };

  // Si el ADMIN_PASSWORD está hasheado con bcrypt, usar bcrypt.compare; si no, usar timingSafeEqual
  const userMatch = timingSafeEq(sha256(adminUserInput), sha256(ADMIN_USER));
  let passMatch = false;
  if (ADMIN_PASSWORD.startsWith('$2a$') || ADMIN_PASSWORD.startsWith('$2b$') || ADMIN_PASSWORD.startsWith('$2y$')) {
    passMatch = await bcrypt.compare(adminPassInput, ADMIN_PASSWORD);
  } else {
    passMatch = timingSafeEq(sha256(adminPassInput), sha256(ADMIN_PASSWORD));
  }

  // Jitter leve para complicar ataques cronometrados
  await new Promise((r) => setTimeout(r, RATE_LIMIT_JITTER_BASE_MS + Math.floor(Math.random() * RATE_LIMIT_JITTER_VARIATION_MS)));

  if (!userMatch || !passMatch) {
    // Registrar intento fallido y aplicar rate limiting/lockout
    const current: RateRecord = rec && now - rec.windowStart <= RATE_LIMIT_WINDOW_MS
      ? { ...rec }
      : { attempts: 0, windowStart: now, lockedUntil: undefined };
    current.attempts += 1;
    if (current.attempts >= RATE_LIMIT_MAX_ATTEMPTS) {
      current.lockedUntil = now + LOCKOUT_MS;
      current.attempts = 0; // opcional: reiniciar contador tras bloquear
    }
    rateStore.set(key, current);
    // Mensaje genérico (no revelar qué campo falló)
    return { ok: false, error: 'Credenciales inválidas. Acceso denegado.' };
  }

  // Éxito: limpiar contador para este cliente
  rateStore.delete(key);
  return { ok: true };
}

function resolveUsersEnv(): { USERS_DB: string; USERS_COLLECTION: string } {
  const USERS_DB =
    process.env.USERS_DB ||
    process.env.USER_DB ||
    process.env.AUTH_DB_USERS ||
    process.env.AUTH_DB ||
    '';
  const USERS_COLLECTION =
    process.env.USERS_COLLECTION ||
    process.env.USER_COLLECTION ||
    process.env.AUTH_DB_COLLECTION ||
    process.env.AUTH_COLLECTION ||
    '';
  return { USERS_DB, USERS_COLLECTION };
}

export async function createUserAction(formData: FormData): Promise<{ ok: boolean; error?: string; insertedId?: string; apiToken?: string }> {
  const username = String(formData.get('username') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const role = String(formData.get('role') || 'user').trim() as Role;

  const { USERS_DB, USERS_COLLECTION } = resolveUsersEnv();

  if (!USERS_DB || !USERS_COLLECTION) {
    return {
      ok: false,
      error:
        'Faltan variables de entorno para BD y colección de usuarios. Usa: USERS_DB/USER_DB/AUTH_DB_USERS/AUTH_DB y USERS_COLLECTION/USER_COLLECTION/AUTH_DB_COLLECTION/AUTH_COLLECTION',
    };
  }

  if (!username || !email || !password) {
    return { ok: false, error: 'Required fields: username, email, and password' };
  }

  if (!['admin', 'user'].includes(role)) {
    return { ok: false, error: "Role must be 'admin' or 'user'" };
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    // Generar un token de API único para el usuario (no almacenar en texto plano)
    const apiTokenPlain = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(apiTokenPlain).digest('hex');

    // Permisos seleccionados por el formulario (checkboxes)
    const selectedPermissions: Permissions = {
      register: Boolean(formData.get('perm_register')),
      delete: Boolean(formData.get('perm_delete')),
      update: Boolean(formData.get('perm_update')),
      find: Boolean(formData.get('perm_find')),
      authClientAccess: Boolean(formData.get('perm_authClientAccess')),
    };

    // Si es admin, por defecto habilitar todas las operaciones
    const permissions: Permissions = role === 'admin'
      ? { register: true, delete: true, update: true, find: true, authClientAccess: true }
      : selectedPermissions;

    const doc: Document = {
      username,
      email,
      password: hashed,
      role,
      permissions,
      apiTokens: [
        {
          tokenHash,
          createdAt: now,
          revoked: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const result: InsertOneResult = await insertOneWithDynamicDB(USERS_DB, USERS_COLLECTION, doc);
    const insertedId: string | undefined = result?.insertedId ? result.insertedId.toString() : undefined;
    // Devolver el token solo en la respuesta (no almacenado en texto plano)
    return { ok: true, insertedId, apiToken: apiTokenPlain };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error occurred while creating the user' };
  }
}

// Actualizar datos de un usuario. Si se incluye password, se re-hashea.
export async function updateUserAction(params: {
  id: string;
  data: Partial<{ username: string; email: string; role: Role; permissions: Permissions; password: string }>;
}): Promise<{ ok: boolean; error?: string; modifiedCount?: number }> {
  const { USERS_DB, USERS_COLLECTION } = resolveUsersEnv();
  const { id, data } = params;
  if (!id) return { ok: false, error: 'User id is required' };

  const update: Record<string, unknown> = {};
  if (data.username !== undefined) update['username'] = data.username.trim();
  if (data.email !== undefined) update['email'] = data.email.trim();
  if (data.role !== undefined) update['role'] = data.role;
  if (data.permissions !== undefined) update['permissions'] = data.permissions;
  if (data.password !== undefined) {
    const hashed = await bcrypt.hash(String(data.password), 10);
    update['password'] = hashed;
  }
  update['updatedAt'] = new Date().toISOString();

  try {
    const res = await updateOneDocument({
      db: USERS_DB,
      collection: USERS_COLLECTION,
      filter: { _id: id },
      update: { $set: update },
      options: {},
    });
    return { ok: true, modifiedCount: res.modifiedCount };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error occurred while updating the user' };
  }
}

// Eliminar un usuario por id
export async function deleteUserAction(params: { id: string }): Promise<{ ok: boolean; error?: string; deletedCount?: number }> {
  const { USERS_DB, USERS_COLLECTION } = resolveUsersEnv();
  const { id } = params;
  if (!id) return { ok: false, error: 'User id is required' };
  try {
    const res = await deleteOneDocument({
      db: USERS_DB,
      collection: USERS_COLLECTION,
      filter: { _id: id },
      options: {},
    });
    return { ok: true, deletedCount: res.deletedCount };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error occurred while deleting the user' };
  }
}

// Generar un nuevo token para un usuario seleccionado. Devuelve el token en texto para mostrarlo al admin.
export async function generateUserTokenAction(params: { id: string }): Promise<{ ok: boolean; error?: string; apiToken?: string }> {
  const { USERS_DB, USERS_COLLECTION } = resolveUsersEnv();
  const { id } = params;
  if (!id) return { ok: false, error: 'User id is required' };

  const apiTokenPlain = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(apiTokenPlain).digest('hex');

  try {
    const res = await updateOneDocument({
      db: USERS_DB,
      collection: USERS_COLLECTION,
      filter: { _id: id },
      update: {
        $push: {
          apiTokens: {
            tokenHash,
            createdAt: new Date().toISOString(),
            revoked: false,
          },
        },
      },
      options: {},
    });

    if (res.modifiedCount > 0) {
      return { ok: true, apiToken: apiTokenPlain };
    }
    return { ok: false, error: 'User not found or token not added' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error occurred while generating a token' };
  }
}

export async function findUserAction(params: { id?: string; username?: string; email?: string }): Promise<{ ok: boolean; error?: string; user?: { _id: string; username: string; email: string; role: Role; permissions: Permissions } }> {
  const { USERS_DB, USERS_COLLECTION } = resolveUsersEnv();
  if (!USERS_DB || !USERS_COLLECTION) return { ok: false, error: 'Missing users DB/collection config' };

  const filter: Record<string, unknown> = {};
  if (params.id) filter._id = params.id;
  else if (params.username) filter.username = params.username.trim();
  else if (params.email) filter.email = params.email.trim();
  else return { ok: false, error: 'Provide id, username or email' };

  try {
    const doc = await findOneDocument(USERS_DB, USERS_COLLECTION, filter);
    if (!doc) return { ok: false, error: 'User not found' };
    const d = doc as MongoDoc & { username?: string; email?: string; role?: Role; permissions?: Partial<Permissions> };
    const permissions: Permissions = {
      register: Boolean(d.permissions?.register),
      delete: Boolean(d.permissions?.delete),
      update: Boolean(d.permissions?.update),
      find: Boolean(d.permissions?.find),
      authClientAccess: Boolean(d.permissions?.authClientAccess),
    };
    const user = {
      _id: String((d as unknown as { _id: unknown })._id),
      username: String(d.username ?? ''),
      email: String(d.email ?? ''),
      role: (d.role === 'admin' ? 'admin' : 'user') as Role,
      permissions,
    };
    return { ok: true, user };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
