import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { checkRateLimit } from "@/lib/rate-limit";
import { ObjectId } from "mongodb";
import { getStmpEnv } from "@/lib/stmp";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {};
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  headers["Access-Control-Allow-Credentials"] = "true";

  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(ip, 5, 60000);

    const body = await request.json().catch(() => null);
    const identifier = body && typeof body.identifier === "string" ? String(body.identifier).trim() : "";
    if (!identifier) {
      return NextResponse.json({ error: "Missing identifier" }, { status: 400, headers });
    }

    const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);
    const user = await usersCol.findOne({ $or: [{ email: identifier }, { username: identifier }] }, { projection: { password: 0 } });
    if (!user) {
      return NextResponse.json({ success: true }, { status: 200, headers });
    }

    const { db, collection: stmpConfig, templates: stmpTemplates } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const events = (cfg && cfg.events) || {};
    if (!events["confirm_sign_up"]) {
      return NextResponse.json({ success: true }, { status: 200, headers });
    }

    const tplCol = await getCollection(db, stmpTemplates);
    const activeTemplate = await tplCol.findOne({ eventKey: "confirm_sign_up", active: true });
    if (!activeTemplate) {
      return NextResponse.json({ success: true }, { status: 200, headers });
    }

    const siteUrl = process.env.API_BASE_URL || "";
    const otpColName = process.env.STMP_OTP || "otp";
    const otpCol = await getCollection(db, otpColName);
    let code = "";
    if (String(activeTemplate.body || "").includes("{{ .CodeConfirmation }}")) {
      const now = new Date();
      const cooldownSec = Number(cfg?.otpCooldownSeconds || 60);
      const maxPerHour = Number(cfg?.otpMaxPerHour || 5);
      const oneMinuteAgo = new Date(now.getTime() - cooldownSec * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recentActive = await otpCol.findOne({ userId: new ObjectId(user._id), used: false, expiresAt: { $gt: now }, createdAt: { $gt: oneMinuteAgo } });
      if (recentActive) {
        return NextResponse.json({ success: true }, { status: 200, headers });
      }
      const hourCount = await otpCol.countDocuments({ userId: new ObjectId(user._id), createdAt: { $gt: oneHourAgo } });
      if (hourCount >= maxPerHour) {
        return NextResponse.json({ success: true }, { status: 200, headers });
      }
      code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const maxAttempts = Number(cfg?.otpMaxAttempts || 5);
      await otpCol.insertOne({ userId: new ObjectId(user._id), code, eventKey: "confirm_sign_up", used: false, attempts: 0, maxAttempts, createdAt: now, expiresAt });
    }

    const replace = (s: string): string => {
      let out = s;
      out = out.replaceAll("{{ .EmailUSer }}", String(user.email || ""));
      out = out.replaceAll("{{ .UserName }}", String(user.username || ""));
      out = out.replaceAll("{{ ._id }}", String(user._id));
      out = out.replaceAll("{{ .SiteURL }}", siteUrl);
      if (code) out = out.replaceAll("{{ .CodeConfirmation }}", code);
      return out;
    };

    const subject = replace(String(activeTemplate.subject || ""));
    const htmlRaw = String(activeTemplate.body || "");
    const sanitize = (h: string) => {
      let out = h;
      out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
      out = out.replace(/on[a-z]+\s*=\s*"[^"]*"/gi, "");
      out = out.replace(/on[a-z]+\s*=\s*'[^']*'/gi, "");
      out = out.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#" ');
      out = out.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#' ");
      return out;
    };
    const html = sanitize(replace(htmlRaw));

    const outboxColName = process.env.STMP_OUTBOX || "outbox";
    const outboxCol = await getCollection(db, outboxColName);
    const queuedAt = new Date();
    await outboxCol.insertOne({ eventKey: "confirm_sign_up", userId: new ObjectId(user._id), to: String(user.email || ""), subject, html, queuedAt, status: "queued" });

    try {
      const { sendMail, ensureReadableEmailHtml } = await import("@/lib/mailer");
      const ok = await sendMail(String(user.email || ""), subject, ensureReadableEmailHtml(html));
      if (ok) {
        await outboxCol.updateOne({ userId: new ObjectId(user._id), eventKey: "confirm_sign_up", queuedAt }, { $set: { status: "sent", sentAt: new Date() } });
      }
    } catch {}

    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: message === "Too many requests, please try again later." ? 429 : 500, headers });
  }
}
