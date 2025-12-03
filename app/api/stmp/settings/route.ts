import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";

type SettingsPayload = {
  requireEmailVerificationLogin?: boolean;
  otpCooldownSeconds?: number;
  otpMaxPerHour?: number;
  otpMaxAttempts?: number;
  inviteCooldownSeconds?: number;
  inviteMaxPerHour?: number;
  inviteTokenTtlHours?: number;
  requireReauthChangePassword?: boolean;
  requireReauthChangeEmail?: boolean;
  requireReauthDeleteAccount?: boolean;
  requireReauthCriticalAction?: boolean;
};

export async function GET(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  const { db, collection } = getStmpEnv();
  const col = await getCollection(db, collection);
  const doc = await col.findOne({ key: "default" });
  const settings = {
    requireEmailVerificationLogin: Boolean(doc?.requireEmailVerificationLogin),
    otpCooldownSeconds: Number(doc?.otpCooldownSeconds || 60),
    otpMaxPerHour: Number(doc?.otpMaxPerHour || 5),
    otpMaxAttempts: Number(doc?.otpMaxAttempts || 5),
    inviteCooldownSeconds: Number(doc?.inviteCooldownSeconds || 60),
    inviteMaxPerHour: Number(doc?.inviteMaxPerHour || 10),
    inviteTokenTtlHours: Number(doc?.inviteTokenTtlHours || 168),
    requireReauthChangePassword: Boolean(doc?.requireReauthChangePassword),
    requireReauthChangeEmail: Boolean(doc?.requireReauthChangeEmail),
    requireReauthDeleteAccount: Boolean(doc?.requireReauthDeleteAccount),
    requireReauthCriticalAction: Boolean(doc?.requireReauthCriticalAction),
  };
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  let body: SettingsPayload = {};
  try { body = await req.json(); } catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }
  const { requireEmailVerificationLogin, otpCooldownSeconds, otpMaxPerHour, otpMaxAttempts, inviteCooldownSeconds, inviteMaxPerHour, inviteTokenTtlHours, requireReauthChangePassword, requireReauthChangeEmail, requireReauthDeleteAccount, requireReauthCriticalAction } = body;
  if (typeof requireEmailVerificationLogin !== "boolean") {
    return NextResponse.json({ success: false, error: "requireEmailVerificationLogin must be boolean" }, { status: 400 });
  }
  const cooldown = Number(otpCooldownSeconds ?? 60);
  const perHour = Number(otpMaxPerHour ?? 5);
  const maxAttempts = Number(otpMaxAttempts ?? 5);
  const inviteCooldown = Number(inviteCooldownSeconds ?? 60);
  const invitePerHour = Number(inviteMaxPerHour ?? 10);
  const inviteTtlHours = Number(inviteTokenTtlHours ?? 168);
  if (!Number.isFinite(cooldown) || cooldown < 0 || cooldown > 3600) {
    return NextResponse.json({ success: false, error: "otpCooldownSeconds invalid" }, { status: 400 });
  }
  if (!Number.isFinite(perHour) || perHour < 0 || perHour > 100) {
    return NextResponse.json({ success: false, error: "otpMaxPerHour invalid" }, { status: 400 });
  }
  if (!Number.isFinite(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) {
    return NextResponse.json({ success: false, error: "otpMaxAttempts invalid" }, { status: 400 });
  }
  if (!Number.isFinite(inviteCooldown) || inviteCooldown < 0 || inviteCooldown > 3600) {
    return NextResponse.json({ success: false, error: "inviteCooldownSeconds invalid" }, { status: 400 });
  }
  if (!Number.isFinite(invitePerHour) || invitePerHour < 0 || invitePerHour > 100) {
    return NextResponse.json({ success: false, error: "inviteMaxPerHour invalid" }, { status: 400 });
  }
  if (!Number.isFinite(inviteTtlHours) || inviteTtlHours < 1 || inviteTtlHours > 720) {
    return NextResponse.json({ success: false, error: "inviteTokenTtlHours invalid" }, { status: 400 });
  }
  const { db, collection } = getStmpEnv();
  const col = await getCollection(db, collection);
  await col.updateOne(
    { key: "default" },
    { $set: { requireEmailVerificationLogin, otpCooldownSeconds: cooldown, otpMaxPerHour: perHour, otpMaxAttempts: maxAttempts, inviteCooldownSeconds: inviteCooldown, inviteMaxPerHour: invitePerHour, inviteTokenTtlHours: inviteTtlHours, ...(typeof requireReauthChangePassword === "boolean" ? { requireReauthChangePassword } : {}), ...(typeof requireReauthChangeEmail === "boolean" ? { requireReauthChangeEmail } : {}), ...(typeof requireReauthDeleteAccount === "boolean" ? { requireReauthDeleteAccount } : {}), ...(typeof requireReauthCriticalAction === "boolean" ? { requireReauthCriticalAction } : {}), updatedAt: new Date().toISOString() }, $setOnInsert: { key: "default", createdAt: new Date().toISOString() } },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}
