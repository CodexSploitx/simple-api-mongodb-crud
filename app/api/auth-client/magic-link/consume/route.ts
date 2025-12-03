import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { getStmpEnv } from "@/lib/stmp";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { generateAccessToken, generateRefreshToken } from "@/lib/auth";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

function getTokenFromQuery(req: NextRequest): string {
  const url = new URL(req.url);
  return url.searchParams.get("token") || "";
}

async function consumeToken(token: string, headers: Record<string, string>) {
  const { db } = getStmpEnv();
  const magicCol = await getCollection(db, process.env.STMP_MAGIC_LINKS || "magiclinks");
  const record = await magicCol.findOne({ token });
  if (!record) {
    return NextResponse.json({ error: "Token not found" }, { status: 404, headers });
  }
  if (record.used) {
    return NextResponse.json({ error: "Token already used" }, { status: 409, headers });
  }
  const exp = record.expiresAt instanceof Date ? record.expiresAt : new Date(record.expiresAt);
  if (exp.getTime() < Date.now()) {
    return NextResponse.json({ error: "Token expired" }, { status: 410, headers });
  }

  const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);
  const user = await usersCol.findOne({ _id: new ObjectId(record.userId) });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404, headers });
  }

  const tokenVersion = user.tokenVersion || 0;
  const userId = String(user._id);
  const accessToken = generateAccessToken({ userId, email: user.email, username: user.username, version: tokenVersion });
  const refreshToken = generateRefreshToken({ userId, version: tokenVersion });

  try {
    await usersCol.updateOne({ _id: new ObjectId(userId) }, { $set: { verifiEmail: true, updatedAt: new Date() } });
  } catch {}
  try {
    await magicCol.updateOne({ token }, { $set: { used: true, usedAt: new Date() } });
  } catch {}

  const cookieStore = await cookies();
  cookieStore.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return NextResponse.json({ success: true, accessToken, user: { id: userId, email: user.email, username: user.username } }, { status: 200, headers });
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { "Access-Control-Allow-Credentials": "true" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  const token = getTokenFromQuery(req);
  if (!token || typeof token !== "string" || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400, headers });
  }
  try { return await consumeToken(token, headers); } catch { return NextResponse.json({ error: "Internal error" }, { status: 500, headers }); }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { "Access-Control-Allow-Credentials": "true" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  try {
    const body = await req.json().catch(() => null);
    const token = body && typeof body.token === "string" ? String(body.token).trim() : "";
    if (!token || token.length < 10) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400, headers });
    }
    return await consumeToken(token, headers);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}
