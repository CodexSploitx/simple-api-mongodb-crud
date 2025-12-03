import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { getCollection } from "@/lib/mongo";
import jwt from "jsonwebtoken";
import { z } from "zod";

const VerifySchema = z.object({ email: z.string().email(), code: z.string().min(4).max(12) });
const JWT_SECRET = process.env.JWT_AUTH || "default-admin-secret";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const json = await request.json();
    const parsed = VerifySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Validation error" }, { status: 400, headers });
    }
    const email = parsed.data.email;
    const code = parsed.data.code;
    const adminEmail = process.env.ADMIN_EMAIL_AUTH_CLIENT || "";
    if (!adminEmail || email.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Email not allowed" }, { status: 401, headers });
    }

    const db = process.env.STMP_DB || process.env.AUTH_CLIENT_DB || "authclient";
    const otpColName = process.env.STMP_OTP || "otp";
    const otpCol = await getCollection(db, otpColName);
    const now = new Date();
    const found = await otpCol.findOne({ adminEmail, code, used: false, expiresAt: { $gt: now } });
    if (!found) {
      return NextResponse.json({ success: false, error: "Invalid or expired code" }, { status: 400, headers });
    }
    await otpCol.updateOne({ _id: found._id }, { $set: { used: true, verifiedAt: new Date() } });

    const token = jwt.sign({ admin: true, email: adminEmail }, JWT_SECRET, { expiresIn: "1h" });
    return NextResponse.json({ success: true, token }, { status: 200, headers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers }
    );
  }
}

