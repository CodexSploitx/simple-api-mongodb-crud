import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { ObjectId } from "mongodb";

function getOtpEnv() {
  const db = process.env.STMP_DB || process.env.AUTH_CLIENT_DB || "authclient";
  const otp = process.env.STMP_OTP || "otp";
  return { db, otp };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    const code = String(body?.code || "").trim();
    if (!userId || !ObjectId.isValid(userId) || !code) {
      return NextResponse.json({ success: false, error: "Invalid fields" }, { status: 400 });
    }
    const { db, otp } = getOtpEnv();
    const col = await getCollection(db, otp);
    const now = new Date();
    const active = await col.findOne({ userId: new ObjectId(userId), used: false, expiresAt: { $gt: now } }, { sort: { createdAt: -1 } });
    if (!active) {
      return NextResponse.json({ success: false, error: "Invalid or expired code" }, { status: 400 });
    }
    const currentAttempts = Number(active.attempts || 0);
    let maxAttempts = Number(active.maxAttempts || 0);
    if (!maxAttempts) {
      const stmp = (await import("@/lib/stmp")).getStmpEnv();
      const cfgCol = await getCollection(stmp.db, stmp.collection);
      const cfg = await cfgCol.findOne({ key: "default" });
      maxAttempts = Number(cfg?.otpMaxAttempts || 5);
    }
    if (code !== String(active.code || "")) {
      const nextAttempts = currentAttempts + 1;
      const updates: Record<string, unknown> = { attempts: nextAttempts, lastAttemptAt: new Date() };
      if (nextAttempts >= maxAttempts) {
        updates["used"] = true;
        updates["disabledAt"] = new Date();
      }
      await col.updateOne({ _id: active._id }, { $set: updates });
      if (nextAttempts >= maxAttempts) {
        return NextResponse.json({ success: false, error: "Too many attempts" }, { status: 429 });
      }
      return NextResponse.json({ success: false, error: "Invalid code" }, { status: 400 });
    }
    await col.updateOne({ _id: active._id }, { $set: { used: true, verifiedAt: new Date() } });
    const USERS_DB = process.env.AUTH_CLIENT_DB || process.env.AUTH_DB_USERS || process.env.USERS_DB || process.env.AUTH_DB || "authclient";
    const USERS_COLLECTION = process.env.AUTH_CLIENT_COLLECTION || process.env.AUTH_DB_COLLECTION || process.env.USERS_COLLECTION || process.env.AUTH_COLLECTION || "users";
    const usersCol = await getCollection(USERS_DB, USERS_COLLECTION);
    await usersCol.updateOne({ _id: new ObjectId(userId) }, { $set: { verifiEmail: true, updatedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
}
