import { NextResponse, NextRequest } from "next/server";
import { getCollection } from "@/lib/mongo";
import { MongoClient } from "mongodb";
import { corsHeaders } from "@/lib/cors";
import { hashPassword } from "@/lib/auth";
import { requireAuthClientAdmin } from "@/lib/auth";
import { ObjectId } from "mongodb";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

// No header token; rely on app auth cookie and permission

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const rc = await requireAuthClientAdmin(request);
    if (!rc.ok) {
      const r = rc as { response: NextResponse };
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: r.response.status, headers }
      );
    }

    const { id } = await params;
    const usersCol = await getCollection(DB_NAME, COLLECTION_NAME);

    interface DeleteBodyOptions {
      mode?: "delete_all" | "delete_some" | "keep_all_delete_only_auth";
      archive?: boolean;
      fields?: { ownerId: boolean; userId: boolean };
      targets?: Array<{ db: string; collections: string[]; fields: ("ownerId"|"userId")[] }>;
    }

    let body: DeleteBodyOptions | null = null;
    try {
      body = await request.json();
    } catch {}

    const mode = body?.mode || undefined;

    const targets = Array.isArray(body?.targets) ? body!.targets : undefined;

    const userDoc = await usersCol.findOne({ _id: new ObjectId(id) });
    if (!userDoc) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404, headers }
      );
    }

    const performArchive = async () => {
      const archiveColName = process.env.AUTH_CLIENT_DELETE_USERS || "deleteusers";
      const archiveDbName = process.env.AUTH_CLIENT_DB || DB_NAME;
      const archiveCol = await getCollection(archiveDbName, archiveColName);
      try {
        await archiveCol.insertOne({ ...userDoc, archivedAt: new Date() });
      } catch {}
    };

    const mongoUri = (() => {
      const direct = process.env.MONGODB_URI?.trim();
      if (direct) return direct;
      const host = process.env.MONGODB_HOST || "localhost";
      const port = process.env.PORT_MONGODB || "27017";
      const user = process.env.MONGODB_USERNAME || process.env.MONGODB_USER || "";
      const pass = process.env.MONGODB_PASSWORD || process.env.MONGODB_PASS || "";
      const auth = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : "";
      return `mongodb://${auth}${host}:${port}`;
    })();

    const deleteInAllDbs = async () => {
      const perCollection: Array<{ db: string; collection: string; deletedCount: number }> = [];
      let client: MongoClient | null = null;
      try {
        client = new MongoClient(mongoUri);
        await client.connect();
        const admin = client.db().admin();
        const dbs = await admin.listDatabases();
        const skip = new Set<string>(["admin", "local", "config"]);
        const adminUsersDb = process.env.AUTH_DB_USERS || "";
        const adminAuthClientDb = process.env.AUTH_CLIENT_DB || "authclient";
        if (adminUsersDb) skip.add(adminUsersDb);
        if (adminAuthClientDb) skip.add(adminAuthClientDb);
        for (const dbInfo of dbs.databases) {
          const dbName = dbInfo.name;
          if (skip.has(dbName)) continue;
          const db = client.db(dbName);
          const colList = await db.listCollections().toArray();
          for (const c of colList) {
            const colName = c.name;
            const skipCols = new Set<string>([
              process.env.AUTH_CLIENT_COLLECTION || "users",
              process.env.AUTH_CLIENT_DELETE_USERS || "deleteusers",
            ]);
            if (skipCols.has(colName)) continue;
            const col = db.collection(colName);
            const or: Array<{ ownerId?: string; userId?: string }> = [];
            const useOwner = body?.fields ? Boolean(body.fields.ownerId) : true;
            const useUser = body?.fields ? Boolean(body.fields.userId) : true;
            if (useOwner) or.push({ ownerId: id });
            if (useUser) or.push({ userId: id });
            if (or.length === 0) continue;
            try {
              const res = await col.deleteMany({ $or: or });
              if (res && res.deletedCount && res.deletedCount > 0) {
                perCollection.push({ db: dbName, collection: colName, deletedCount: res.deletedCount });
              }
            } catch {}
          }
        }
      } finally {
        if (client) { try { await client.close(); } catch {} }
      }
      return perCollection;
    };

    const deleteInTargets = async (items: Array<{ db: string; collections: string[]; fields: ("ownerId"|"userId")[] }>) => {
      const perCollection: Array<{ db: string; collection: string; deletedCount: number }> = [];
      let client: MongoClient | null = null;
      try {
        client = new MongoClient(mongoUri);
        await client.connect();
        for (const t of items) {
          const db = client.db(t.db);
      const or: Array<{ ownerId?: string; userId?: string }> = [];
      if (t.fields.includes("ownerId")) or.push({ ownerId: id });
      if (t.fields.includes("userId")) or.push({ userId: id });
      if (or.length === 0) continue;
          for (const colName of t.collections) {
            const skipCols = new Set<string>([
              process.env.AUTH_CLIENT_COLLECTION || "users",
              process.env.AUTH_CLIENT_DELETE_USERS || "deleteusers",
            ]);
            if (skipCols.has(colName)) continue;
            const col = db.collection(colName);
            try {
              const res = await col.deleteMany({ $or: or });
              if (res && res.deletedCount && res.deletedCount > 0) {
                perCollection.push({ db: t.db, collection: colName, deletedCount: res.deletedCount });
              }
            } catch {}
          }
        }
      } finally {
        if (client) { try { await client.close(); } catch {} }
      }
      return perCollection;
    };

    let perCollection: Array<{ db: string; collection: string; deletedCount: number }> = [];
    let archived = false;
    if (mode === "keep_all_delete_only_auth") {
      await performArchive();
      archived = true;
    } else if (mode === "delete_some" && targets && targets.length > 0) {
      perCollection = await deleteInTargets(targets);
      await performArchive();
      archived = true;
    } else if (mode === "delete_all") {
      perCollection = await deleteInAllDbs();
    }

    const result = await usersCol.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404, headers }
      );
    }

    const totalDeleted = perCollection.reduce((sum, r) => sum + (r.deletedCount || 0), 0);
    return NextResponse.json(
      { success: true, message: "User deleted successfully", deletedByCollection: perCollection, totalDeleted, archived },
      { status: 200, headers }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    const rc = await requireAuthClientAdmin(request);
    if (!rc.ok) {
      const r = rc as { response: NextResponse };
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: r.response.status, headers }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, newPassword } = body;

    const collection = await getCollection(DB_NAME, COLLECTION_NAME);

    if (action === "revokeTokens") {
      // Increment tokenVersion to invalidate all existing tokens
      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { tokenVersion: 1 }, $set: { updatedAt: new Date() } },
        { returnDocument: "after" }
      );

      if (!result) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404, headers }
        );
      }

      return NextResponse.json(
        {
          success: true,
          newTokenVersion: result.tokenVersion,
          message: "Tokens revoked successfully",
        },
        { status: 200, headers }
      );
    } else if (action === "changePassword") {
      if (!newPassword) {
        return NextResponse.json(
          { success: false, error: "New password is required" },
          { status: 400, headers }
        );
      }

      const hashedPassword = await hashPassword(newPassword);
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            password: hashedPassword,
            updatedAt: new Date(),
          },
          $inc: { tokenVersion: 1 }, // Also revoke existing tokens
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404, headers }
        );
      }

      return NextResponse.json(
        { success: true, message: "Password changed successfully" },
        { status: 200, headers }
      );
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400, headers }
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers }
    );
  }
}
