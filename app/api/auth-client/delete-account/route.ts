import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { requireAuthClient, verifyReauthToken } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

export async function POST(req: NextRequest) {
  const auth = await requireAuthClient(req);
  if (!auth.ok) return auth.response;
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = { "Access-Control-Allow-Credentials": "true" };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  try {
    const { db, collection: stmpConfig } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const needReauth = Boolean(cfg?.requireReauthDeleteAccount);
    if (needReauth) {
      const rt = req.headers.get("x-reauth-token") || "";
      const rp = rt ? verifyReauthToken(rt) : null;
      const okReauth = Boolean(rp && rp.userId === auth.userId && (!rp.action || rp.action === "delete_account"));
      if (!okReauth) {
        return NextResponse.json({ error: "Reauthentication required" }, { status: 401, headers });
      }
    }

    const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);
    const res = await usersCol.deleteOne({ _id: new ObjectId(auth.userId) });
    if (res.deletedCount !== 1) {
      return NextResponse.json({ error: "User not found" }, { status: 404, headers });
    }
    const cookieStore = await cookies();
    cookieStore.delete("refreshToken");
    return NextResponse.json({ success: true }, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
}

