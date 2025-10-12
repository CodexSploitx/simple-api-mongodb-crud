import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongo";
import { validateJsonBodyMiddleware } from "@/lib/requestValidation";
import bcrypt from "bcryptjs";
import type { Document } from "mongodb";
import { createHmac } from "crypto";

function resolveUsersEnv() {
  const db =
    process.env.USERS_DB ||
    process.env.USER_DB ||
    process.env.AUTH_DB_USERS ||
    process.env.AUTH_DB ||
    "";
  const collection =
    process.env.USERS_COLLECTION ||
    process.env.USER_COLLECTION ||
    process.env.AUTH_DB_COLLECTION ||
    process.env.AUTH_COLLECTION ||
    "";
  return { db, collection };
}

function base64url(input: Buffer | string): string {
  const raw = Buffer.isBuffer(input) ? input.toString("base64") : Buffer.from(input).toString("base64");
  return raw.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function parseExpiration(exp: string | undefined): number {
  if (!exp) return 3600; // default 1h in seconds
  const m = /^([0-9]+)\s*([smhd])?$/.exec(exp.trim());
  if (!m) return 3600;
  const value = parseInt(m[1], 10);
  const unit = m[2] || "s";
  const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  return value * (multipliers[unit] || 1);
}

function signJWTHS256(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = base64url(createHmac("sha256", secret).update(data).digest());
  return `${data}.${sig}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const bodyOrError = await validateJsonBodyMiddleware(req);
    if (bodyOrError instanceof NextResponse) {
      return bodyOrError;
    }

    const { email, password } = bodyOrError as { email?: string; password?: string };
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email y password son requeridos" },
        { status: 400 }
      );
    }

    const { db, collection } = resolveUsersEnv();
    if (!db || !collection) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Faltan variables de entorno USERS_DB/USER_DB/AUTH_DB_USERS/AUTH_DB y USERS_COLLECTION/USER_COLLECTION/AUTH_DB_COLLECTION/AUTH_COLLECTION",
        },
        { status: 500 }
      );
    }

    const database = await connectToDatabase(db);
    const col = database.collection(collection);
    const user: Document | null = await col.findOne({ email });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const hashedPassword = String(user.password || "");
    const ok = hashedPassword && (await bcrypt.compare(password, hashedPassword));
    if (!ok) {
      return NextResponse.json(
        { success: false, message: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    const JWT_EXPIRATION = process.env.JWT_EXPIRATION;
    if (!JWT_SECRET) {
      return NextResponse.json(
        { success: false, message: "JWT_SECRET no está configurado" },
        { status: 500 }
      );
    }
    const maxAge = parseExpiration(JWT_EXPIRATION);

    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      _id: String(user._id),
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role,
      permissions: user.permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      iat: nowSec,
      exp: nowSec + maxAge,
    };

    const token = signJWTHS256(payload, JWT_SECRET);
    const res = NextResponse.json({ success: true }, { status: 200 });
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Error en /api/auth/login:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}