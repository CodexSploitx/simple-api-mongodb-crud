import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { z } from "zod";
import { getStmpEnv } from "@/lib/stmp";

const ToggleSchema = z.object({
  eventKey: z.string().min(1).max(64),
  active: z.boolean(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  const { db, collection } = getStmpEnv();
  const col = await getCollection(db, collection);
  const doc = await col.findOne({ key: "default" });
  const events = (doc && doc.events) || {};
  return NextResponse.json({ success: true, events });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  let payload: unknown;
  try { payload = await req.json(); } catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }
  const parsed = ToggleSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ success: false, error: "Validation error" }, { status: 400 });
  const { eventKey, active } = parsed.data;
  const { db, collection } = getStmpEnv();
  const col = await getCollection(db, collection);
  if (active) {
    const { templates } = getStmpEnv();
    const tplCol = await getCollection(db, templates);
    const tpl = await tplCol.findOne({ eventKey, active: true });
    const hasHtml = Boolean(tpl?.body && String(tpl.body).trim().length > 0);
    if (!tpl || !hasHtml) {
      const defaults = getDefaultTemplate(eventKey);
      if (!defaults) {
        return NextResponse.json({ success: false, error: "Unsupported eventKey" }, { status: 400 });
      }
      await tplCol.updateMany({ eventKey }, { $set: { active: false } });
      await tplCol.updateOne(
        { eventKey, name: "__default__" },
        {
          $set: { eventKey, name: "__default__", subject: defaults.subject, body: defaults.body, active: true, updatedAt: new Date().toISOString() },
          $setOnInsert: { createdAt: new Date().toISOString() },
        },
        { upsert: true }
      );
    }
  }
  await col.updateOne(
    { key: "default" },
    { $set: { [`events.${eventKey}`]: active, updatedAt: new Date().toISOString() }, $setOnInsert: { key: "default", createdAt: new Date().toISOString() } },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}

function baseTemplate(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { background-color:#0d1117; margin:0; padding:0; font-family:'Segoe UI', Arial, sans-serif; color:#e6edf3; }
    .container { max-width:520px; margin:40px auto; background:#161b22; border-radius:12px; padding:30px; box-shadow:0 4px 15px rgba(0,0,0,0.35); border:1px solid #21262d; }
    .title { text-align:center; font-size:24px; font-weight:700; margin-bottom:25px; color:#e6edf3; }
    .code-box { text-align:center; background:#1f2937; padding:18px; border-radius:10px; font-size:28px; font-weight:bold; letter-spacing:3px; color:#3b82f6; margin:20px 0; border:1px solid #2d3a52; }
    .button { display:inline-block; text-decoration:none; background:#3b82f6; color:#ffffff; padding:14px 28px; border-radius:8px; font-weight:bold; font-size:16px; text-align:center; margin:20px auto; }
    p { font-size:16px; line-height:1.6; color:#cdd9e5; }
    .footer { text-align:center; margin-top:30px; font-size:13px; color:#8b949e; }
  </style>
</head>
<body>
  <div class="container">
    <h2 class="title">${title}</h2>
    ${inner}
    <div class="footer">© ${new Date().getFullYear()} - All rights reserved.</div>
  </div>
</body>
</html>`;
}

function getDefaultTemplate(eventKey: string): { subject: string; body: string } | null {
  switch (eventKey) {
    case "confirm_sign_up": {
      const subject = "Confirm Your Signup";
      const inner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>Thank you for signing up with the email <strong>{{ .EmailUSer }}</strong>.</p>`,
        `<p>Your confirmation code is:</p>`,
        `<div class="code-box">{{ .CodeConfirmation }}</div>`,
        `<p>You can also confirm your account using the button below:</p>`,
        `<div style="text-align:center;"><a href="{{ .SiteURL }}/auth/confirmation?token={{ .Token }}&email={{ .EmailUSer }}" class="button" target="_blank">Confirm My Email</a></div>`,
        `<p>If you didn’t request this, you can ignore this message.</p>`
      ].join("\n");
      return { subject, body: baseTemplate("Account Confirmation", inner) };
    }
    case "invite_user": {
      const subject = "You're invited to join";
      const inner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>You have been invited to join. Use the link below to create your account:</p>`,
        `<div style="text-align:center;"><a href="{{ .SiteURL }}/auth/sign-up?token={{ .Token }}" class="button" target="_blank">Create Account</a></div>`,
        `<p>If you didn’t request this, you can ignore this message.</p>`
      ].join("\n");
      return { subject, body: baseTemplate("Invitation", inner) };
    }
    case "magic_link": {
      const subject = "Your magic link";
      const inner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>Use the following button to sign in:</p>`,
        `<div style="text-align:center;"><a href="{{ .SiteURL }}/auth/magic?token={{ .Token }}&email={{ .EmailUSer }}" class="button" target="_blank">Sign in</a></div>`,
        `<p>This link may expire soon.</p>`
      ].join("\n");
      return { subject, body: baseTemplate("Magic Link", inner) };
    }
    case "change_email": {
      const subject = "Confirm your email change";
      const inner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>We received a request to change your email to <strong>{{ .EmailUSer }}</strong>.</p>`,
        `<p>Confirm this change using the button:</p>`,
        `<div style="text-align:center;"><a href="{{ .SiteURL }}/auth/change-email?token={{ .Token }}" class="button" target="_blank">Confirm Change</a></div>`
      ].join("\n");
      return { subject, body: baseTemplate("Email Change", inner) };
    }
    case "reset_password": {
      const subject = "Reset your password";
      const inner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>Your reset code is:</p>`,
        `<div class="code-box">{{ .CodeConfirmation }}</div>`,
        `<p>Or reset using the button:</p>`,
        `<div style="text-align:center;"><a href="{{ .SiteURL }}/auth/reset?token={{ .Token }}&email={{ .EmailUSer }}" class="button" target="_blank">Reset Password</a></div>`
      ].join("\n");
      return { subject, body: baseTemplate("Password Reset", inner) };
    }
    case "reauthentication": {
      const subject = "Reauthenticate to continue";
      const inner = [
        `<p>Hello <strong>{{ .UserName }}</strong>,</p>`,
        `<p>Please confirm this action. Your code is:</p>`,
        `<div class="code-box">{{ .CodeConfirmation }}</div>`
      ].join("\n");
      return { subject, body: baseTemplate("Reauthentication", inner) };
    }
    default:
      return null;
  }
}

