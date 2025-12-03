import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClient, verifyReauthToken } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";
import { ObjectId } from "mongodb";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

export async function POST(req: NextRequest) {
  const auth = await requireAuthClient(req);
  if (!auth.ok) return auth.response;
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { "Access-Control-Allow-Credentials": "true" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  try {
    const body = await req.json().catch(() => null);
    const type = body && typeof body.type === "string" ? String(body.type).trim() : "";
    const reason = body && typeof body.reason === "string" ? String(body.reason).trim() : "";
    if (!type) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400, headers });
    }

    const { db, collection: stmpConfig } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const needReauth = Boolean(cfg?.requireReauthCriticalAction);
    if (needReauth) {
      const rt = req.headers.get("x-reauth-token") || "";
      const rp = rt ? verifyReauthToken(rt) : null;
      const okReauth = Boolean(rp && rp.userId === auth.userId && (!rp.action || rp.action === "critical_action"));
      if (!okReauth) {
        return NextResponse.json({ error: "Reauthentication required" }, { status: 401, headers });
      }
    }

    const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);
    const userId = new ObjectId(auth.userId);

    if (type === "suspend_account") {
      const update = await usersCol.updateOne(
        { _id: userId },
        { $set: { suspended: true, suspendedAt: new Date(), suspendReason: reason || undefined, updatedAt: new Date() } }
      );
      if (update.matchedCount !== 1) {
        return NextResponse.json({ error: "User not found" }, { status: 404, headers });
      }
      return NextResponse.json({ success: true, status: "suspended" }, { status: 200, headers });
    }

    return NextResponse.json({ error: "Unsupported type" }, { status: 400, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}
