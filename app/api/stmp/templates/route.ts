import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { z } from "zod";
import { getStpmEnv } from "@/lib/stmp";

const TemplateSchema = z.object({
  eventKey: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  subject: z.string().min(1),
  body: z.string().min(1),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  const { db, templates } = getStmpEnv();
  const col = await getCollection(db, templates);
  const name = req.nextUrl.searchParams.get("name");
  const eventKey = req.nextUrl.searchParams.get("eventKey");
  if (name && eventKey) {
    const doc = await col.findOne({ eventKey, name }, { projection: { _id: 0, eventKey: 1, name: 1, subject: 1, body: 1, active: 1 } });
    return NextResponse.json({ success: true, data: doc || null });
  }
  if (eventKey) {
    const list = await col.find({ eventKey }).project({ _id: 0, eventKey: 1, name: 1, subject: 1, body: 1, active: 1 }).toArray();
    return NextResponse.json({ success: true, data: list });
  }
  const list = await col.find({}).project({ _id: 0, eventKey: 1, name: 1, subject: 1, body: 1, active: 1 }).toArray();
  return NextResponse.json({ success: true, data: list });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  const body = await req.json();
  const parsed = TemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error" }, { status: 400 });
  }
  const { eventKey, name, subject, body: content, active } = parsed.data;
  const { db, templates } = getStmpEnv();
  const col = await getCollection(db, templates);
  if (active === true) {
    await col.updateMany({ eventKey }, { $set: { active: false } });
  }
  await col.updateOne(
    { eventKey, name },
    {
      $set: { eventKey, name, subject, body: content, updatedAt: new Date().toISOString(), ...(active !== undefined ? { active } : {}) },
      $setOnInsert: { createdAt: new Date().toISOString() },
    },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}

