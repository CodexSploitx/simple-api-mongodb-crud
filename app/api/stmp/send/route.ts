import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { getStmpEnv } from "@/lib/stmp";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { ensureReadableEmailHtml } from "@/lib/mailer";

function resolveUsersEnv(): { USERS_DB: string; USERS_COLLECTION: string } {
  const USERS_DB =
    process.env.USERS_DB ||
    process.env.USER_DB ||
    process.env.AUTH_DB_USERS ||
    process.env.AUTH_CLIENT_DB ||
    process.env.AUTH_DB ||
    "";
  const USERS_COLLECTION =
    process.env.USERS_COLLECTION ||
    process.env.USER_COLLECTION ||
    process.env.AUTH_DB_COLLECTION ||
    process.env.AUTH_CLIENT_COLLECTION ||
    process.env.AUTH_COLLECTION ||
    "";
  return { USERS_DB, USERS_COLLECTION };
}

function sanitizeHtml(html: string): string {
  let out = html;
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  out = out.replace(/on[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/on[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#" ');
  out = out.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#' ");
  return out;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  let payload: { eventKey?: string; userId?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }
  const eventKey = String(payload.eventKey || "").trim();
  const userId = String(payload.userId || "").trim();
  if (!eventKey || !userId || !ObjectId.isValid(userId)) {
    return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
  }

  const { USERS_DB, USERS_COLLECTION } = resolveUsersEnv();
  if (!USERS_DB || !USERS_COLLECTION) {
    return NextResponse.json({ success: false, error: "Users configuration missing" }, { status: 500 });
  }

  const { db, templates, collection: stmpConfig } = getStmpEnv();
  const templatesCol = await getCollection(db, templates);
  const cfgCol = await getCollection(db, stmpConfig);
  const cfg = await cfgCol.findOne({ key: "default" });
  const activeTemplate = await templatesCol.findOne({ eventKey, active: true });
  if (!activeTemplate) {
    return NextResponse.json({ success: false, error: "No active template for event" }, { status: 404 });
  }

  const usersCol = await getCollection(USERS_DB, USERS_COLLECTION);
  const user = await usersCol.findOne({ _id: new ObjectId(userId) }, { projection: { password: 0 } });
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const siteUrl = process.env.API_BASE_URL || "";

  let code = "";
  if (String(activeTemplate.body || "").includes("{{ .CodeConfirmation }}")) {
    const otpColName = process.env.STMP_OTP || "otp";
    const otpCol = await getCollection(db, otpColName);
    code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos
    const maxAttempts = Number(cfg?.otpMaxAttempts || 5);
    await otpCol.insertOne({ userId: new ObjectId(userId), code, eventKey, used: false, attempts: 0, maxAttempts, createdAt: new Date(), expiresAt });
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
  const html = ensureReadableEmailHtml(sanitizeHtml(replace(String(activeTemplate.body || ""))));

  const outboxColName = process.env.STMP_OUTBOX || "outbox";
  const outboxCol = await getCollection(db, outboxColName);
  await outboxCol.insertOne({
    eventKey,
    userId: new ObjectId(userId),
    to: String(user.email || ""),
    subject,
    html,
    queuedAt: new Date(),
    status: "queued",
  });

  return NextResponse.json({ success: true, queued: true });
}
