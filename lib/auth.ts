import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "./mongo";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const REAUTH_TOKEN_EXPIRES_IN = "5m";

export interface TokenPayload {
  userId: string;
  email?: string;
  username?: string;
  version: number;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateAccessToken(payload: Omit<TokenPayload, "iat" | "exp">) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function generateRefreshToken(payload: Pick<TokenPayload, "userId" | "version">) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function generateReauthToken(payload: { userId: string; version: number; action?: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REAUTH_TOKEN_EXPIRES_IN });
}

export function verifyReauthToken(token: string): (TokenPayload & { action?: string }) | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload & { action?: string };
  } catch {
    return null;
  }
}

export type RequireAuthClientOk = { ok: true; userId: string };
export type RequireAuthClientError = { ok: false; response: NextResponse };
export async function requireAuthClient(req: NextRequest): Promise<RequireAuthClientOk | RequireAuthClientError> {
  const enabled = String(process.env.RELACIONALDB_AUTH_CLIENT || "false").toLowerCase() === "true";
  if (!enabled) {
    return { ok: false, response: NextResponse.json({ error: "Auth Client deshabilitado" }, { status: 403 }) };
  }
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { ok: false, response: NextResponse.json({ error: "Token de autorización faltante" }, { status: 401 }) };
  }
  const payload = verifyToken(token);
  if (!payload || !payload.userId) {
    return { ok: false, response: NextResponse.json({ error: "Token inválido" }, { status: 401 }) };
  }
  const dbName = process.env.AUTH_CLIENT_DB || "authclient";
  const colName = process.env.AUTH_CLIENT_COLLECTION || "users";
  const col = await getCollection(dbName, colName);
  const oid = new ObjectId(payload.userId);
  const user = await col.findOne({ _id: oid });
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 }) };
  }
  if (typeof user.tokenVersion === "number" && user.tokenVersion !== payload.version) {
    return { ok: false, response: NextResponse.json({ error: "Token revocado" }, { status: 403 }) };
  }
  return { ok: true, userId: payload.userId };
}

export async function requireAuthClientAdmin(req: NextRequest): Promise<RequireAuthClientOk | RequireAuthClientError> {
  const jwtCookie = req.cookies.get("auth_token")?.value || "";
  if (!jwtCookie) {
    return { ok: false, response: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return { ok: false, response: NextResponse.json({ error: "Configuración faltante" }, { status: 500 }) };
  }
  try {
    const payload = jwt.verify(jwtCookie, secret) as { _id?: string } | string;
    const userId = typeof payload === "string" ? undefined : payload?._id;
    if (!userId || !ObjectId.isValid(userId)) {
      return { ok: false, response: NextResponse.json({ error: "Token inválido" }, { status: 401 }) };
    }
    const USERS_DB = process.env.USERS_DB || process.env.USER_DB || process.env.AUTH_DB_USERS || process.env.AUTH_DB || "";
    const USERS_COLLECTION = process.env.USERS_COLLECTION || process.env.USER_COLLECTION || process.env.AUTH_DB_COLLECTION || process.env.AUTH_COLLECTION || "";
    if (!USERS_DB || !USERS_COLLECTION) {
      return { ok: false, response: NextResponse.json({ error: "Configuración de usuarios faltante" }, { status: 500 }) };
    }
    const col = await getCollection(USERS_DB, USERS_COLLECTION);
    const user = await col.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return { ok: false, response: NextResponse.json({ error: "Usuario no encontrado" }, { status: 401 }) };
    }
    const allowed = Boolean(user.permissions?.authClientAccess === true);
    if (!allowed) {
      return { ok: false, response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
    }
    return { ok: true, userId: String(user._id) };
  } catch  {
    return { ok: false, response: NextResponse.json({ error: "Token inválido" }, { status: 401 }) };
  }
}
