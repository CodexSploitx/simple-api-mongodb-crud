import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClient } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";
import { ObjectId } from "mongodb";

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
    const { db } = getStmpEnv();
    const changeCol = await getCollection(db, process.env.STMP_CHANGE_EMAIL || "changeemail");
    const otpEnv = getOtpEnv();
    const otpCol = await getCollection(otpEnv.db, otpEnv.otp);
    const otpDoc = await otpCol.findOne({ userId: new ObjectId(auth.userId), eventKey: "change_email_current", used: false }, { sort: { createdAt: -1 } });
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
    await changeCol.updateOne({ userId: new ObjectId(auth.userId), status: "current_requested" }, { $set: { status: "current_verified", verifiedAt: new Date() } });
    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}

