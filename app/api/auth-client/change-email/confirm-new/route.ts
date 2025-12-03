import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClient, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

function getOtpEnv() {
  const db = process.env.STMP_DB || process.env.AUTH_CLIENT_DB || "authclient";
  const otp = process.env.STMP_OTP || "otp";
  return { db, otp };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthClient(req);
  if (!auth.ok) return auth.response;
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { "Access-Control-Allow-Credentials": "true" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  try {
    const body = await req.json().catch(() => null);
    const code = body && typeof body.code === "string" ? String(body.code).trim() : "";
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400, headers });
    }
    const { db, collection: stmpConfig } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const events = (cfg && cfg.events) || {};
    if (!events["change_email"]) {
      return NextResponse.json({ error: "Change email deactivated: event not active" }, { status: 400, headers });
    }
    const changeCol = await getCollection(db, process.env.STMP_CHANGE_EMAIL || "changeemail");
    const reqDoc = await changeCol.findOne({ userId: new ObjectId(auth.userId), status: "new_requested" });
    if (!reqDoc || !reqDoc.newEmail) {
      return NextResponse.json({ error: "New email not requested" }, { status: 400, headers });
    }
    const otpEnv = getOtpEnv();
    const otpCol = await getCollection(otpEnv.db, otpEnv.otp);
    const otpDoc = await otpCol.findOne({ userId: new ObjectId(auth.userId), eventKey: "change_email_new", used: false }, { sort: { createdAt: -1 } });
    if (!otpDoc) {
      return NextResponse.json({ error: "Code not found" }, { status: 404, headers });
    }
    const exp = otpDoc.expiresAt instanceof Date ? otpDoc.expiresAt : new Date(otpDoc.expiresAt);
    if (exp.getTime() < Date.now()) {
      return NextResponse.json({ error: "Code expired" }, { status: 410, headers });
    }
    if (String(otpDoc.code) !== code) {
      const attempts = Number(otpDoc.attempts || 0) + 1;
      const maxAttempts = Number(otpDoc.maxAttempts || 5);
      await otpCol.updateOne({ _id: new ObjectId(otpDoc._id) }, { $set: { attempts, used: attempts >= maxAttempts } });
      return NextResponse.json({ error: attempts >= maxAttempts ? "Too many attempts" : "Invalid code" }, { status: attempts >= maxAttempts ? 429 : 400, headers });
    }
    await otpCol.updateOne({ _id: new ObjectId(otpDoc._id) }, { $set: { used: true, usedAt: new Date() } });

    const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);
    const user = await usersCol.findOne({ _id: new ObjectId(auth.userId) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404, headers });
    }
    const newEmail = String(reqDoc.newEmail);
    await usersCol.updateOne({ _id: new ObjectId(auth.userId) }, { $set: { email: newEmail, updatedAt: new Date(), verifiEmail: true }, $inc: { tokenVersion: 1 } });
    await changeCol.updateOne({ _id: new ObjectId(reqDoc._id) }, { $set: { status: "completed", completedAt: new Date() } });

    const tokenVersion = Number(user.tokenVersion || 0) + 1;
    const accessToken = generateAccessToken({ userId: String(auth.userId), email: newEmail, username: user.username, version: tokenVersion });
    const refreshToken = generateRefreshToken({ userId: String(auth.userId), version: tokenVersion });
    const cookieStore = await cookies();
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });
    return NextResponse.json({ success: true, accessToken, user: { id: String(auth.userId), email: newEmail, username: user.username } }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}

