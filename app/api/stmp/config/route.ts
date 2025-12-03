import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { z } from "zod";
import { getStmpEnv, encryptSecret } from "@/lib/stmp";

const StpmSchema = z.object({
  senderEmail: z.string().email(),
  senderName: z.string().min(1),
  host: z.string().min(1),
  port: z.coerce.number().int().min(1),
  minIntervalSeconds: z.coerce.number().int().min(0),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  const { db, collection } = getStmpEnv();
  const col = await getCollection(db, collection);
  const doc = await col.findOne({ key: "default" });
  if (!doc) {
    return NextResponse.json({ success: true, data: null });
  }
  const result = {
    senderEmail: doc.senderEmail || "",
    senderName: doc.senderName || "",
    host: doc.host || "",
    port: doc.port || 0,
    minIntervalSeconds: doc.minIntervalSeconds || 0,
    credentialsSet: Boolean(doc.credentials && doc.credentials.username && doc.credentials.password),
  };
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  const body = await req.json();
  const parsed = StpmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Validation error" }, { status: 400 });
  }
  const { senderEmail, senderName, host, port, minIntervalSeconds, username, password } = parsed.data;
  const { db, collection } = getStmpEnv();
  const col = await getCollection(db, collection);
  const update: Record<string, unknown> = {
    senderEmail,
    senderName,
    host,
    port,
    minIntervalSeconds,
    updatedAt: new Date().toISOString(),
  };
  const creds: Record<string, unknown> = {};
  if (username) {
    const encU = encryptSecret(username);
    creds.username = encU;
  }
  if (password) {
    const encP = encryptSecret(password);
    creds.password = encP;
  }
  if (Object.keys(creds).length > 0) {
    update.credentials = creds;
  }
  await col.updateOne(
    { key: "default" },
    {
      $set: {
        ...update,
      },
      $setOnInsert: { key: "default", createdAt: new Date().toISOString() },
    },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}
