import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { getStmpEnv } from "@/lib/stmp";
import { ObjectId } from "mongodb";

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
    if (!email || !/.+@.+\..+/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400, headers });
    }

    const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);
    const user = await usersCol.findOne({ email });
    if (!user) {
      // Return 200 to avoid user enumeration
      return NextResponse.json({ success: true }, { status: 200, headers });
    }

    const { db, collection: stmpConfig, templates, outbox } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const events = (cfg && cfg.events) || {};
    if (!events["reset_password"]) {
      return NextResponse.json({ error: "Reset password deactivated: event not active" }, { status: 400, headers });
    }

    const otpEnv = getOtpEnv();
    const otpCol = await getCollection(otpEnv.db, otpEnv.otp);
    const now = new Date();
    const ttlSeconds = Number(cfg?.otpTtlSeconds || 600);
    const maxAttempts = Number(cfg?.otpMaxAttempts || 5);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    await otpCol.insertOne({ userId: new ObjectId(user._id), code, eventKey: "reset_password", used: false, attempts: 0, maxAttempts, createdAt: now, expiresAt });

    const tplCol = await getCollection(db, templates);
    let tpl = await tplCol.findOne({ eventKey: "reset_password", active: true });
    if (!tpl) {
      await tplCol.updateMany({ eventKey: "reset_password" }, { $set: { active: false } });
      const subject = "Reset your password";
      const inner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>Your reset code is:</p>`,
        `<div class=\"code-box\">{{ .CodeConfirmation }}</div>`
      ].join("\n");
      const bodyHtml = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\" /><title>Password Reset</title></head><body>${inner}</body></html>`;
      await tplCol.updateOne(
        { eventKey: "reset_password", name: "__default__" },
        { $set: { eventKey: "reset_password", name: "__default__", subject, body: bodyHtml, active: true, updatedAt: new Date().toISOString() }, $setOnInsert: { createdAt: new Date().toISOString() } },
        { upsert: true }
      );
      tpl = await tplCol.findOne({ eventKey: "reset_password", name: "__default__" });
    }

    const siteUrl = process.env.API_BASE_URL || "";
    const usernameDisplay = String(user.username || email.split("@")[0]);
    const replace = (s: string): string => {
      let out = s;
      out = out.replaceAll("{{ .EmailUSer }}", email);
      out = out.replaceAll("{{ .UserName }}", usernameDisplay);
      out = out.replaceAll("{{ .CodeConfirmation }}", code);
      out = out.replaceAll("{{ .Token }}", code);
      out = out.replaceAll("{{ .SiteURL }}", siteUrl);
      out = out.replaceAll("{{ ._id }}", String(user._id));
      return out;
    };

    const subject = replace(String(tpl?.subject || "Reset your password"));
    const html = replace(String(tpl?.body || ""));
    const outboxCol = await getCollection(db, outbox);
    const queuedAt = new Date();
    await outboxCol.insertOne({ eventKey: "reset_password", userId: new ObjectId(user._id), to: email, subject, html, queuedAt, status: "queued" });
    try {
      const { sendMail, ensureReadableEmailHtml } = await import("@/lib/mailer");
      const send = await sendMail(email, subject, ensureReadableEmailHtml(html));
      if (send.ok) await outboxCol.updateOne({ eventKey: "reset_password", to: email, queuedAt }, { $set: { status: "sent", sentAt: new Date() } });
    } catch {}

    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}

