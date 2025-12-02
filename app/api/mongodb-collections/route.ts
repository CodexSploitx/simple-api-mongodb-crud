import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const dbName = req.nextUrl.searchParams.get("db") || "";
  const userId = req.nextUrl.searchParams.get("userId") || "";
  if (!dbName) {
    return NextResponse.json({ error: "Missing db parameter" }, { status: 400 });
  }

  const uri = (() => {
    const direct = process.env.MONGODB_URI?.trim();
    if (direct) return direct;
    const host = process.env.MONGODB_HOST || "localhost";
    const port = process.env.PORT_MONGODB || "27017";
    const user = process.env.MONGODB_USERNAME || process.env.MONGODB_USER || "";
    const pass = process.env.MONGODB_PASSWORD || process.env.MONGODB_PASS || "";
    const auth = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : "";
    return `mongodb://${auth}${host}:${port}`;
  })();

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const cols = await db.listCollections().toArray();
    const skipCols = new Set<string>([
      process.env.AUTH_CLIENT_COLLECTION || "users",
      process.env.AUTH_CLIENT_DELETE_USERS || "deleteusers",
    ]);
    if (!userId) {
      const names = cols.map((c) => c.name).filter((n) => !skipCols.has(n)).sort();
      return NextResponse.json({ collections: names }, { status: 200 });
    }
    const filterOr: Array<Record<string, unknown>> = [];
    filterOr.push({ ownerId: userId });
    filterOr.push({ userId: userId });
    try {
      const oid = new ObjectId(userId);
      filterOr.push({ ownerId: oid });
      filterOr.push({ userId: oid });
    } catch {}
    const names: string[] = [];
    for (const c of cols) {
      const colName = c.name;
      if (skipCols.has(colName)) continue;
      const col = db.collection(colName);
      const cnt = await col.countDocuments({ $or: filterOr }, { limit: 1 });
      if (cnt > 0) names.push(colName);
    }
    names.sort();
    return NextResponse.json({ collections: names }, { status: 200 });
  } catch (error) {
    console.error("Error listing collections:", error);
    return NextResponse.json({ error: "Failed to list collections" }, { status: 500 });
  } finally {
    if (client) { try { await client.close(); } catch {} }
  }
}
