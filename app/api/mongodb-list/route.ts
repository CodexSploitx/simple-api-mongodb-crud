import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function GET() {
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
  const excludeNames = new Set<string>(["admin", "local", "config"]);
  // Also exclude the auth users DB from env if provided (line 22 reference)
  const authUsersDb = process.env.AUTH_DB_USERS || "";
  if (authUsersDb) excludeNames.add(authUsersDb);

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri);
    await client.connect();

    const admin = client.db().admin();
    const dbs = await admin.listDatabases();

    const result: Record<string, true> = {};
    for (const db of dbs.databases) {
      const name = db.name;
      if (!excludeNames.has(name)) {
        result[name] = true;
      }
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error listing MongoDB databases:", error);
    return NextResponse.json(
      {
        error: "Failed to list databases",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try { await client.close(); } catch {}
    }
  }
}