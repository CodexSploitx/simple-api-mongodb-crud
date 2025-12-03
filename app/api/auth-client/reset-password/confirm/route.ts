import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { ObjectId } from "mongodb";
import { hashPassword } from "@/lib/auth";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

function getOtpEnv() {
  const db = process.env.STMP_DB || process.env.AUTH_CLIENT_DB || "authclient";
  const otp = process.env.STMP_OTP || "otp";
  return { db, otp };
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { "Access-Control-Allow-Credentials": "true" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  try {
    const body = await req.json().catch(() => null);
    const email = body && typeof body.email === "string" ? String(body.email).trim() : "";
    const code = body && typeof body.code === "string" ? String(body.code).trim() : "";
    const newPassword = body && typeof body.newPassword === "string" ? String(body.newPassword) : "";
    if (!email || !/.+@.+\..+/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400, headers });
    }
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400, headers });
    }
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "Weak password" }, { status: 400, headers });
    }

    const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);
    const user = await usersCol.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404, headers });
    }

    const otpEnv = getOtpEnv();
    const otpCol = await getCollection(otpEnv.db, otpEnv.otp);
    const otpDoc = await otpCol.findOne({ userId: new ObjectId(user._id), eventKey: "reset_password", used: false }, { sort: { createdAt: -1 } });
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
    const hashed = await hashPassword(newPassword);
    await usersCol.updateOne({ _id: new ObjectId(user._id) }, { $set: { password: hashed, updatedAt: new Date() }, $inc: { tokenVersion: 1 } });

    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}

