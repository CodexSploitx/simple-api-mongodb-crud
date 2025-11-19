import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function GET(req: NextRequest) {
  const dbName = req.nextUrl.searchParams.get("db") || "";
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
    const names = cols.map((c) => c.name).sort();
    return NextResponse.json({ collections: names }, { status: 200 });
  } catch (error) {
    console.error("Error listing collections:", error);
    return NextResponse.json({ error: "Failed to list collections" }, { status: 500 });
  } finally {
    if (client) { try { await client.close(); } catch {} }
  }
}