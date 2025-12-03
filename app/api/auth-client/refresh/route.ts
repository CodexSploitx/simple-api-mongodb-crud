import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { verifyToken, generateAccessToken } from "@/lib/auth";
import { corsHeaders, isCorsEnabled, getAllowedCorsOrigins, originAllowed } from "@/lib/cors";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  const allowed = await getAllowedCorsOrigins();
  return NextResponse.json({}, { headers: corsHeaders(origin, enabled, allowed) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  const allowed = await getAllowedCorsOrigins();
  const headers = corsHeaders(origin, enabled, allowed);
  if (enabled && !originAllowed(origin, allowed)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }

  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token missing" },
        { status: 401, headers }
      );
    }

    const payload = verifyToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid refresh token" },
        { status: 401, headers }
      );
    }

    const { userId, version } = payload;
    const collection = await getCollection(DB_NAME, COLLECTION_NAME);
    
    const user = await collection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401, headers }
      );
    }

    // Check token version
    if (user.tokenVersion !== version) {
      return NextResponse.json(
        { error: "Token revoked" },
        { status: 403, headers }
      );
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({ userId, email: user.email, username: user.username, version: user.tokenVersion });

    return NextResponse.json(
      { accessToken: newAccessToken },
      { status: 200, headers }
    );
  } catch (error: unknown) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers }
    );
  }
}
