import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { z } from "zod";
import { getStpmEnv } from "@/lib/stpm";

const ToggleSchema = z.object({
  eventKey: z.string().min(1).max(64),
  active: z.boolean(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  const { db, collection } = getStpmEnv();
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
  const { db, collection } = getStpmEnv();
  const col = await getCollection(db, collection);
  await col.updateOne(
    { key: "default" },
    { $set: { [`events.${eventKey}`]: active, updatedAt: new Date().toISOString() }, $setOnInsert: { key: "default", createdAt: new Date().toISOString() } },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}

