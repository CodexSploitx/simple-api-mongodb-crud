import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { ObjectId } from "mongodb";

function getOtpEnv() {
  const db = process.env.STMP_DB || process.env.AUTH_CLIENT_DB || "authclient";
  const otp = process.env.STMP_OTP || "otp";
  return { db, otp };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  try {
    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    const eventKey = body?.eventKey ? String(body.eventKey) : undefined;
    const ttlSeconds = Number(body?.ttlSeconds || 600);
    const { db, otp } = getOtpEnv();
    const stmp = (await import("@/lib/stmp")).getStmpEnv();
    const cfgCol = await getCollection(stmp.db, stmp.collection);
    const cfg = await cfgCol.findOne({ key: "default" });
    const maxAttempts = Number(cfg?.otpMaxAttempts || 5);
    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, error: "Invalid userId" }, { status: 400 });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const col = await getCollection(db, otp);
    await col.insertOne({ userId: new ObjectId(userId), code, eventKey, used: false, attempts: 0, maxAttempts, createdAt: new Date(), expiresAt });
    return NextResponse.json({ success: true, code, expiresAt: expiresAt.toISOString() });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
}
