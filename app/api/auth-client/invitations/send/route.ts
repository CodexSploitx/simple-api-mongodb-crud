import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClient } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";
import { ObjectId } from "mongodb";

export async function POST(req: NextRequest) {
  const auth = await requireAuthClient(req);
  if (!auth.ok) return auth.response;
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { "Access-Control-Allow-Credentials": "true" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;

  try {
    const body = await req.json().catch(() => null);
    const email = body && typeof body.email === "string" ? String(body.email).trim() : "";
    const promoCode = body && typeof body.promoCode === "string" ? String(body.promoCode).trim() : "";
    const rewardTitle = body && typeof body.rewardTitle === "string" ? String(body.rewardTitle).trim() : "";
    const rewardText = body && typeof body.rewardText === "string" ? String(body.rewardText).trim() : "";
    if (!email || !/.+@.+\..+/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400, headers });
    }

    const { db, collection: stmpConfig, templates, outbox } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const events = (cfg && cfg.events) || {};
    if (!events["invite_user"]) {
      return NextResponse.json({ error: "Event not active" }, { status: 400, headers });
    }

    const tplCol = await getCollection(db, templates);
    const tpl = await tplCol.findOne({ eventKey: "invite_user", active: true });
    if (!tpl) {
      return NextResponse.json({ error: "No active template" }, { status: 404, headers });
    }

    const invitesCol = await getCollection(db, process.env.STMP_INVITES || "invites");
    const now = new Date();
    const ttlHours = Number(cfg?.inviteTokenTtlHours || 168);
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);
    const token = new ObjectId().toHexString() + ":" + Buffer.from(String(Math.random())).toString("base64");
    await invitesCol.insertOne({ token, inviterId: new ObjectId(auth.userId), email, promoCode, rewardTitle, rewardText, createdAt: now, expiresAt, used: false });

    const siteUrl = process.env.API_BASE_URL || "";
    const usernameDisplay = email.split("@")[0];
    const replace = (s: string): string => {
      let out = s;
      out = out.replaceAll("{{ .EmailUSer }}", email);
      out = out.replaceAll("{{ .UserName }}", usernameDisplay);
      out = out.replaceAll("{{ .Token }}", token);
      out = out.replaceAll("{{ .SiteURL }}", siteUrl);
      if (promoCode) out = out.replaceAll("{{ .PromoCode }}", promoCode);
      if (rewardTitle) out = out.replaceAll("{{ .RewardTitle }}", rewardTitle);
      if (rewardText) out = out.replaceAll("{{ .RewardText }}", rewardText);
      return out;
    };

    const subject = replace(String(tpl.subject || "You're invited to join"));
    const html = replace(String(tpl.body || ""));
    const outboxCol = await getCollection(db, outbox);
    const queuedAt = new Date();
    await outboxCol.insertOne({ eventKey: "invite_user", userId: new ObjectId(auth.userId), to: email, subject, html, queuedAt, status: "queued" });

    try {
      const { sendMail, ensureReadableEmailHtml } = await import("@/lib/mailer");
      const send = await sendMail(email, subject, ensureReadableEmailHtml(html));
      if (send.ok) await outboxCol.updateOne({ eventKey: "invite_user", to: email, queuedAt }, { $set: { status: "sent", sentAt: new Date() } });
    } catch {}

    return NextResponse.json({ success: true, token }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}
