import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { ObjectId } from "mongodb";

function getOtpEnv() {
  const db = process.env.STPM_DB || process.env.AUTH_CLIENT_DB || "authclient";
  const otp = process.env.STPM_OTP || "otp";
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
    const found = await col.findOne({ userId: new ObjectId(userId), code, used: false, expiresAt: { $gt: now } });
    if (!found) {
      return NextResponse.json({ success: false, error: "Invalid or expired code" }, { status: 400 });
    }
    await col.updateOne({ _id: found._id }, { $set: { used: true, verifiedAt: new Date() } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
}

