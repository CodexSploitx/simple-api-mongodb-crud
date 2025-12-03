import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { z } from "zod";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const SETTINGS_COLLECTION = process.env.AUTH_CLIENT_SETTINGS || "settings";

const SettingsSchema = z.object({ relacionaldb_auth_client: z.boolean().optional(), cors_enabled: z.boolean().optional() });

export async function GET(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  const col = await getCollection(DB_NAME, SETTINGS_COLLECTION);
  const doc = await col.findOne({ key: "access_mode" });
  const data = { relacionaldb_auth_client: Boolean(doc?.relacionaldb_auth_client === true), cors_enabled: Boolean(doc?.cors_enabled === true) };
  return NextResponse.json({ success: true, data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  let payload: unknown;
  try { payload = await req.json(); } catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }
  const parsed = SettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error" }, { status: 400 });
  }
  const col = await getCollection(DB_NAME, SETTINGS_COLLECTION);
  const $set: Record<string, unknown> = { key: "access_mode", updatedAt: new Date().toISOString() };
  if (typeof parsed.data.relacionaldb_auth_client === "boolean") $set.relacionaldb_auth_client = parsed.data.relacionaldb_auth_client;
  if (typeof parsed.data.cors_enabled === "boolean") $set.cors_enabled = parsed.data.cors_enabled;
  await col.updateOne(
    { key: "access_mode" },
    { $set, $setOnInsert: { createdAt: new Date().toISOString() } },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}
