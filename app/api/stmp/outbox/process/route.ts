import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";
import { sendMail } from "@/lib/mailer";
import { ObjectId } from "mongodb";

type BodyOpts = { limit?: number; maxAttempts?: number; eventKey?: string };

interface OutboxEntry {
  _id: string | ObjectId;
  eventKey: string;
  to: string;
  subject?: string;
  html?: string;
  queuedAt?: Date | string;
  sentAt?: Date | string;
  status: "queued" | "retry" | "failed" | "sent" | string;
  attempts?: number;
  lastError?: string | null;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  let body: BodyOpts = {};
  try { body = await req.json(); } catch {}
  const limit = Number(body?.limit || 50);
  const maxAttempts = Number(body?.maxAttempts || 3);
  const onlyEvent = body?.eventKey ? String(body.eventKey) : undefined;

  const { db } = getStmpEnv();
  const outboxColName = process.env.STMP_OUTBOX || "outbox";
  const col = await getCollection(db, outboxColName);
  const q: Record<string, unknown> = { $or: [ { status: "queued" }, { status: "retry" }, { status: "failed" } ] };
  if (onlyEvent) q.eventKey = onlyEvent;
  const items = await col.find(q).sort({ queuedAt: 1 }).limit(limit).toArray() as unknown as OutboxEntry[];

  let processed = 0; let sent = 0; let failed = 0;
  for (const it of items) {
    processed++;
    const res = await sendMail(String(it.to), String(it.subject || ""), String(it.html || ""));
    if (res.ok) {
      sent++;
      await col.updateOne({ _id: new ObjectId(it._id) }, { $set: { status: "sent", sentAt: new Date(), lastError: null } });
    } else {
      failed++;
      const attempts = Number(it.attempts || 0) + 1;
      await col.updateOne({ _id: new ObjectId(it._id) }, { $set: { status: attempts >= maxAttempts ? "failed" : "retry", attempts, lastError: res.error || "send error" } });
    }
  }
  return NextResponse.json({ success: true, processed, sent, failed });
}

