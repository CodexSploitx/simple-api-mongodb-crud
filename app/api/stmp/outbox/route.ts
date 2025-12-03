import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClientAdmin, type RequireAuthClientError } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";

export async function GET(req: NextRequest) {
  const auth = await requireAuthClientAdmin(req);
  if (!auth.ok) return (auth as RequireAuthClientError).response;
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const eventKey = req.nextUrl.searchParams.get("eventKey") || undefined;
  const limit = Number(req.nextUrl.searchParams.get("limit") || 100);
  const { db, outbox } = getStmpEnv();
  const col = await getCollection(db, outbox);
  const q: Record<string, unknown> = {};
  if (status) q.status = status;
  if (eventKey) q.eventKey = eventKey;
  const list = await col.find(q).sort({ queuedAt: -1 }).limit(limit).toArray();
  const countsAgg = await col.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]).toArray() as Array<{ _id: string; count: number }>;
  const counts: Record<string, number> = {};
  countsAgg.forEach((d) => { counts[String(d._id)] = Number(d.count || 0); });
  return NextResponse.json({ success: true, data: list, counts });
}
