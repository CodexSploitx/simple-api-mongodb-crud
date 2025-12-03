import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClient } from "@/lib/auth";
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
  const auth = await requireAuthClient(req);
  if (!auth.ok) return auth.response;
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { "Access-Control-Allow-Credentials": "true" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  try {
    const body = await req.json().catch(() => null);
    const newEmail = body && typeof body.newEmail === "string" ? String(body.newEmail).trim() : "";
    if (!newEmail || !/.+@.+\..+/.test(newEmail)) {
      return NextResponse.json({ error: "Invalid newEmail" }, { status: 400, headers });
    }
    const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);
    const exists = await usersCol.findOne({ email: newEmail });
    if (exists) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409, headers });
    }
    const { db, collection: stmpConfig, templates, outbox } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const events = (cfg && cfg.events) || {};
    if (!events["change_email"]) {
      return NextResponse.json({ error: "Change email deactivated: event not active" }, { status: 400, headers });
    }
    const changeCol = await getCollection(db, process.env.STMP_CHANGE_EMAIL || "changeemail");
    const reqDoc = await changeCol.findOne({ userId: new ObjectId(auth.userId), status: "current_verified" });
    if (!reqDoc) {
      return NextResponse.json({ error: "Current email not verified" }, { status: 400, headers });
    }
    const otpEnv = getOtpEnv();
    const otpCol = await getCollection(otpEnv.db, otpEnv.otp);
    const now = new Date();
    const ttlSeconds = Number(cfg?.otpTtlSeconds || 600);
    const maxAttempts = Number(cfg?.otpMaxAttempts || 5);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    await otpCol.insertOne({ userId: new ObjectId(auth.userId), code, eventKey: "change_email_new", used: false, attempts: 0, maxAttempts, createdAt: now, expiresAt, email: newEmail });

    const tplCol = await getCollection(db, templates);
    let tpl = await tplCol.findOne({ eventKey: "change_email", active: true });
    if (!tpl) {
      await tplCol.updateMany({ eventKey: "change_email" }, { $set: { active: false } });
      const subject = "Confirm your email change";
      const inner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>Please confirm your new email <strong>{{ .EmailUSer }}</strong>.</p>`,
        `<p>Your confirmation code is:</p>`,
        `<div class="code-box">{{ .CodeConfirmation }}</div>`
      ].join("\n");
      const bodyHtml = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\" /><title>Email Change</title></head><body>${inner}</body></html>`;
      await tplCol.updateOne(
        { eventKey: "change_email", name: "__default__" },
        { $set: { eventKey: "change_email", name: "__default__", subject, body: bodyHtml, active: true, updatedAt: new Date().toISOString() }, $setOnInsert: { createdAt: new Date().toISOString() } },
        { upsert: true }
      );
      tpl = await tplCol.findOne({ eventKey: "change_email", name: "__default__" });
    }

    const siteUrl = process.env.API_BASE_URL || "";
    const userDoc = await usersCol.findOne({ _id: new ObjectId(auth.userId) });
    const usernameDisplay = String(userDoc?.username || newEmail.split("@")[0]);
    const replace = (s: string): string => {
      let out = s;
      out = out.replaceAll("{{ .EmailUSer }}", newEmail);
      out = out.replaceAll("{{ .UserName }}", usernameDisplay);
      out = out.replaceAll("{{ .CodeConfirmation }}", code);
      out = out.replaceAll("{{ .Token }}", code);
      out = out.replaceAll("{{ .SiteURL }}", siteUrl);
      out = out.replaceAll("{{ ._id }}", String(auth.userId));
      return out;
    };

    const subject = replace(String(tpl?.subject || "Confirm your email change"));
    const html = replace(String(tpl?.body || ""));
    const outboxCol = await getCollection(db, outbox);
    const queuedAt = new Date();
    await outboxCol.insertOne({ eventKey: "change_email", userId: new ObjectId(auth.userId), to: newEmail, subject, html, queuedAt, status: "queued" });
    try {
      const { sendMail, ensureReadableEmailHtml } = await import("@/lib/mailer");
      const send = await sendMail(newEmail, subject, ensureReadableEmailHtml(html));
      if (send.ok) await outboxCol.updateOne({ eventKey: "change_email", to: newEmail, queuedAt }, { $set: { status: "sent", sentAt: new Date() } });
    } catch {}

    await changeCol.updateOne({ userId: new ObjectId(auth.userId), status: "current_verified" }, { $set: { status: "new_requested", newEmail, requestedNewAt: new Date() } });

    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}
