import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";

type CleanupBody = { olderThanDays?: number };

export async function POST(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  let body: CleanupBody = {};
  try { body = await req.json(); } catch {}
  const days = Number(body?.olderThanDays || 7);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const { db, outbox } = getStmpEnv();
  const col = await getCollection(db, outbox);
  const res = await col.deleteMany({ status: { $in: ["failed", "sent"] }, queuedAt: { $lt: cutoff } });
  return NextResponse.json({ success: true, deleted: res.deletedCount || 0 });
}
