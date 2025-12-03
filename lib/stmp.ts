import crypto from "crypto";

export function getStmpEnv() {
  const db = process.env.STMP_DB || "stmpdb";
  const collection = process.env.STMP_COLLECTION || "config";
  const templates = process.env.STMP_TEMPLATES || "templates";
  const otp = process.env.STMP_OTP || "otp";
  const outbox = process.env.STMP_OUTBOX || "outbox";
  return { db, collection, templates, otp, outbox };
}

function getKey(): Buffer {
  const raw = process.env.STMP_ENCRYPTION_KEY || process.env.JWT_SECRET || "default-key";
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): { iv: string; tag: string; data: string } {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { iv: iv.toString("base64"), tag: tag.toString("base64"), data: enc.toString("base64") };
}

export function decryptSecret(payload: { iv: string; tag: string; data: string }): string {
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const data = Buffer.from(payload.data, "base64");
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

