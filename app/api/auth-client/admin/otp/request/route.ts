import { NextResponse } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCollection } from "@/lib/mongo";
import { getStmpEnv } from "@/lib/stmp";
import { z } from "zod";

const RequestSchema = z.object({ email: z.string().email() });

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(ip, 3, 60000);

    const json = await request.json();
    const parsed = RequestSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Validation error" }, { status: 400, headers });
    }
    const email = parsed.data.email;
    const adminEmail = process.env.ADMIN_EMAIL_AUTH_CLIENT || "";
    if (!adminEmail || email.toLowerCase() !== adminEmail.toLowerCase()) {
      return NextResponse.json({ success: false, error: "Email not allowed" }, { status: 401, headers });
    }

    const { db, collection: stmpConfig, templates: stmpTemplates } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const events = (cfg && cfg.events) || {};
    if (!events["reauthentication"]) {
      return NextResponse.json({ success: false, error: "Event disabled" }, { status: 400, headers });
    }
    const tplCol = await getCollection(db, stmpTemplates);
    const activeTemplate = await tplCol.findOne({ eventKey: "reauthentication", active: true });
    if (!activeTemplate) {
      return NextResponse.json({ success: false, error: "No active template" }, { status: 400, headers });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const otpColName = process.env.STMP_OTP || "otp";
    const otpCol = await getCollection(db, otpColName);
    await otpCol.insertOne({ adminEmail, code, eventKey: "reauthentication", used: false, createdAt: new Date(), expiresAt });

    const siteUrl = process.env.API_BASE_URL || "";
    const replace = (s: string): string => {
      let out = s;
      out = out.replaceAll("{{ .EmailUSer }}", String(adminEmail));
      out = out.replaceAll("{{ .UserName }}", "Admin");
      out = out.replaceAll("{{ ._id }}", "");
      out = out.replaceAll("{{ .permissions.register }}", "true");
      out = out.replaceAll("{{ .permissions.delete }}", "true");
      out = out.replaceAll("{{ .permissions.update }}", "true");
      out = out.replaceAll("{{ .permissions.find }}", "true");
      out = out.replaceAll("{{ .permissions.authClientAccess }}", "true");
      out = out.replaceAll("{{ .Token }}", "");
      out = out.replaceAll("{{ .SiteURL }}", siteUrl);
      out = out.replaceAll("{{ .CodeConfirmation }}", code);
      return out;
    };

    const sanitize = (h: string) => {
      let out = h;
      out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
      out = out.replace(/on[a-z]+\s*=\s*"[^"]*"/gi, "");
      out = out.replace(/on[a-z]+\s*=\s*'[^']*'/gi, "");
      out = out.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#" ');
      out = out.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#' ");
      return out;
    };

    const subject = replace(String(activeTemplate.subject || ""));
    const html = sanitize(replace(String(activeTemplate.body || "")));
    const outboxColName = process.env.STMP_OUTBOX || "outbox";
    const outboxCol = await getCollection(db, outboxColName);
    await outboxCol.insertOne({
      eventKey: "reauthentication",
      adminEmail,
      to: String(adminEmail),
      subject,
      html,
      queuedAt: new Date(),
      status: "queued",
    });

    return NextResponse.json({ success: true, queued: true }, { status: 200, headers });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: message === "Too many requests, please try again later." ? 429 : 500, headers }
    );
  }
}

