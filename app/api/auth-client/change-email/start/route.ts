import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClient } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";
import { verifyReauthToken } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { verifyPassword } from "@/lib/auth";

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
    const currentEmail = body && typeof body.currentEmail === "string" ? String(body.currentEmail).trim() : "";
    const password = body && typeof body.password === "string" ? String(body.password) : "";
    if (!currentEmail || !/.+@.+\..+/.test(currentEmail)) {
      return NextResponse.json({ error: "Invalid currentEmail" }, { status: 400, headers });
    }
    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400, headers });
    }

    const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);
    const user = await usersCol.findOne({ _id: new ObjectId(auth.userId) });
    if (!user || String(user.email).toLowerCase() !== currentEmail.toLowerCase()) {
      return NextResponse.json({ error: "Current email mismatch" }, { status: 400, headers });
    }
    const okPass = await verifyPassword(password, String(user.password || ""));
    if (!okPass) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401, headers });
    }

    const { db, collection: stmpConfig, templates, outbox } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const events = (cfg && cfg.events) || {};
    if (!events["change_email"]) {
      return NextResponse.json({ error: "Change email deactivated: event not active" }, { status: 400, headers });
    }

    const needReauth = Boolean(cfg?.requireReauthChangeEmail);
    if (needReauth) {
      const rt = req.headers.get("x-reauth-token") || "";
      const rp = rt ? verifyReauthToken(rt) : null;
      const okReauth = Boolean(rp && rp.userId === auth.userId && (!rp.action || rp.action === "change_email"));
      if (!okReauth) {
        return NextResponse.json({ error: "Reauthentication required" }, { status: 401, headers });
      }
    }

    const otpEnv = getOtpEnv();
    const otpCol = await getCollection(otpEnv.db, otpEnv.otp);
    const now = new Date();
    const ttlSeconds = Number(cfg?.otpTtlSeconds || 600);
    const maxAttempts = Number(cfg?.otpMaxAttempts || 5);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);
    await otpCol.insertOne({ userId: new ObjectId(auth.userId), code, eventKey: "change_email_current", used: false, attempts: 0, maxAttempts, createdAt: now, expiresAt });

    const tplCol = await getCollection(db, templates);
    let tpl = await tplCol.findOne({ eventKey: "change_email", active: true });
    if (!tpl) {
      await tplCol.updateMany({ eventKey: "change_email" }, { $set: { active: false } });
      const subject = "Confirm your email change";
      const inner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>We received a request to change your email for the account <strong>{{ .EmailUSer }}</strong>.</p>`,
        `<p>Your confirmation code is:</p>`,
        `<div class="code-box">{{ .CodeConfirmation }}</div>`
      ].join("\n");
      const body = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\" /><title>Email Change</title></head><body>${inner}</body></html>`;
      await tplCol.updateOne(
        { eventKey: "change_email", name: "__default__" },
        { $set: { eventKey: "change_email", name: "__default__", subject, body, active: true, updatedAt: new Date().toISOString() }, $setOnInsert: { createdAt: new Date().toISOString() } },
        { upsert: true }
      );
      tpl = await tplCol.findOne({ eventKey: "change_email", name: "__default__" });
    }

    const siteUrl = process.env.API_BASE_URL || "";
    const usernameDisplay = String(user.username || currentEmail.split("@")[0]);
    const replace = (s: string): string => {
      let out = s;
      out = out.replaceAll("{{ .EmailUSer }}", currentEmail);
      out = out.replaceAll("{{ .UserName }}", usernameDisplay);
      out = out.replaceAll("{{ .CodeConfirmation }}", code);
      out = out.replaceAll("{{ .Token }}", code);
      out = out.replaceAll("{{ .SiteURL }}", siteUrl);
      out = out.replaceAll("{{ ._id }}", String(user._id));
      return out;
    };

    const subject = replace(String(tpl?.subject || "Confirm your email change"));
    const html = replace(String(tpl?.body || ""));
    const outboxCol = await getCollection(db, outbox);
    const queuedAt = new Date();
    await outboxCol.insertOne({ eventKey: "change_email", userId: new ObjectId(auth.userId), to: currentEmail, subject, html, queuedAt, status: "queued" });
    try {
      const { sendMail, ensureReadableEmailHtml } = await import("@/lib/mailer");
      const send = await sendMail(currentEmail, subject, ensureReadableEmailHtml(html));
      if (send.ok) await outboxCol.updateOne({ eventKey: "change_email", to: currentEmail, queuedAt }, { $set: { status: "sent", sentAt: new Date() } });
    } catch {}

    const changeCol = await getCollection(db, process.env.STMP_CHANGE_EMAIL || "changeemail");
    const requestId = new ObjectId();
    const request = { _id: requestId, userId: new ObjectId(auth.userId), status: "current_requested", createdAt: now, expiresAt: new Date(now.getTime() + 15 * 60 * 1000) };
    await changeCol.insertOne(request);

    return NextResponse.json({ success: true, requestId: String(requestId) }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}

