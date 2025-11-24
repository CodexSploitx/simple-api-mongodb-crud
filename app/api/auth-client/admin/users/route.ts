import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { corsHeaders } from "@/lib/cors";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_AUTH || "default-admin-secret";
const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

function verifyAdminToken(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { admin?: boolean };
    return decoded.admin === true;
  } catch {
    return false;
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    // Verify admin token
    const authHeader = request.headers.get("authorization");
    if (!verifyAdminToken(authHeader)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401, headers }
      );
    }

    // Fetch all users, excluding password
    const collection = await getCollection(DB_NAME, COLLECTION_NAME);
    const users = await collection
      .find({}, { projection: { password: 0 } })
      .toArray();

    return NextResponse.json(
      { success: true, users },
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
