import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { getStmpEnv } from "@/lib/stmp";
import { ObjectId } from "mongodb";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

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
      return NextResponse.json({ error: "User not found" }, { status: 404, headers });
    }

    const { db, collection: stmpConfig, templates, outbox } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const events = (cfg && cfg.events) || {};
    if (!events["magic_link"]) {
      return NextResponse.json({ error: "Magic link deactivated: event not active" }, { status: 400, headers });
    }

    const tplCol = await getCollection(db, templates);
    let tpl = await tplCol.findOne({ eventKey: "magic_link", active: true });
    if (!tpl) {
      const defaultInner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>Use the following button to sign in:</p>`,
        `<div style="text-align:center;"><a href="{{ .SiteURL }}/auth/magic?token={{ .Token }}&email={{ .EmailUSer }}" class="button" target="_blank">Sign in</a></div>`,
        `<p>This link may expire soon.</p>`
      ].join("\n");
      const defaultHtml = `<!DOCTYPE html><html><head><meta charset=\"UTF-8\" /><title>Magic Link</title></head><body>${defaultInner}</body></html>`;
      await tplCol.updateMany({ eventKey: "magic_link" }, { $set: { active: false } });
      await tplCol.updateOne(
        { eventKey: "magic_link", name: "__default__" },
        { $set: { eventKey: "magic_link", name: "__default__", subject: "Your magic link", body: defaultHtml, active: true, updatedAt: new Date().toISOString() }, $setOnInsert: { createdAt: new Date().toISOString() } },
        { upsert: true }
      );
      tpl = await tplCol.findOne({ eventKey: "magic_link", name: "__default__" });
    }

    const magicCol = await getCollection(db, process.env.STMP_MAGIC_LINKS || "magiclinks");
    const now = new Date();
    const ttlMinutes = Number(cfg?.magicLinkTtlMinutes || 60);
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
    const token = new ObjectId().toHexString() + ":" + Buffer.from(String(Math.random())).toString("base64");
    await magicCol.insertOne({ token, userId: new ObjectId(user._id), email, used: false, createdAt: now, expiresAt });

    const siteUrl = process.env.API_BASE_URL || "";
    const usernameDisplay = String(user.username || email.split("@")[0]);
    const replace = (s: string): string => {
      let out = s;
      out = out.replaceAll("{{ .EmailUSer }}", email);
      out = out.replaceAll("{{ .UserName }}", usernameDisplay);
      out = out.replaceAll("{{ .Token }}", token);
      out = out.replaceAll("{{ .SiteURL }}", siteUrl);
      out = out.replaceAll("{{ ._id }}", String(user._id));
      return out;
    };

    const subject = replace(String((tpl && tpl.subject) || "Your magic link"));
    const html = replace(String((tpl && tpl.body) || ""));
    const outboxCol = await getCollection(db, outbox);
    const queuedAt = new Date();
    await outboxCol.insertOne({ eventKey: "magic_link", userId: new ObjectId(user._id), to: email, subject, html, queuedAt, status: "queued" });

    try {
      const { sendMail, ensureReadableEmailHtml } = await import("@/lib/mailer");
      const send = await sendMail(email, subject, ensureReadableEmailHtml(html));
      if (send.ok) await outboxCol.updateOne({ eventKey: "magic_link", to: email, queuedAt }, { $set: { status: "sent", sentAt: new Date() } });
    } catch {}

    return NextResponse.json({ success: true, token }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}

