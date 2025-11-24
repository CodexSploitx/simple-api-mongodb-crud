import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "./mongo";
import { ObjectId } from "mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
const ACCESS_TOKEN_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";

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
