import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

type Params = { params: Promise<{ db: string }> };

export async function GET(_request: Request, { params }: Params) {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const { db } = await params;

  if (!db || typeof db !== "string" || db.trim() === "") {
    return NextResponse.json({ error: "Invalid database name" }, { status: 400 });
  }

  let client: MongoClient | null = null;
  try {
    client = new MongoClient(uri);
    await client.connect();

    const database = client.db(db);
    const collections = await database.listCollections().toArray();
    const names = collections
      .map((c) => c.name)
      .filter((name) => !name.startsWith("system."));

    return NextResponse.json({ collections: names }, { status: 200 });
  } catch (error) {
    console.error(`Error listing collections for db '${db}':`, error);
    return NextResponse.json(
      {
        error: "Failed to list collections",
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