import nodemailer from "nodemailer";
import { getCollection } from "@/lib/mongo";
import { getStpmEnv, decryptSecret } from "@/lib/stmp";

export async function getSmtpTransport(): Promise<nodemailer.Transporter | null> {
  const { db, collection } = getStmpEnv();
  const col = await getCollection(db, collection);
  const cfg = await col.findOne({ key: "default" });
  if (!cfg || !cfg.host || !cfg.port || !cfg.senderEmail) return null;
  const userEnc = cfg.credentials?.username;
  const passEnc = cfg.credentials?.password;
  if (!userEnc || !passEnc) return null;
  const user = decryptSecret(userEnc);
  const pass = decryptSecret(passEnc);
  const transporter = nodemailer.createTransport({
    host: String(cfg.host),
    port: Number(cfg.port),
    secure: Number(cfg.port) === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendMail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const transporter = await getSmtpTransport();
  if (!transporter) return { ok: false, error: "SMTP not configured" };
  const { db, collection } = getStmpEnv();
  const col = await getCollection(db, collection);
  const cfg = await col.findOne({ key: "default" });
  const from = `${String(cfg?.senderName || "")} <${String(cfg?.senderEmail || "no-reply@example.com")}>`;
  try {
    await transporter.sendMail({ from, to, subject, html });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "SMTP send error";
    return { ok: false, error: msg };
  }
}

export function ensureReadableEmailHtml(html: string): string {
  const content = String(html || "").trim();
  const container = `<div style="background-color:#ffffff;margin:0;padding:20px"><div style="max-width:640px;margin:0 auto;color:#0d0d0d;font-family:Segoe UI, Tahoma, Geneva, Verdana, sans-serif;font-size:14px;line-height:1.6">${content}</div></div>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="margin:0;padding:0">${container}</body></html>`;
}
