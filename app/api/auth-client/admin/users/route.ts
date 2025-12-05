import { NextResponse, NextRequest } from "next/server";
import { getCollection } from "@/lib/mongo";
import { corsHeaders, isCorsEnabled, getAllowedCorsOrigins, originAllowed } from "@/lib/cors";
import { requireAuthClientAdmin } from "@/lib/auth";
const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

// No longer using header token; rely on app auth cookie and permission

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  const allowed = await getAllowedCorsOrigins();
  return NextResponse.json({}, { headers: corsHeaders(origin, enabled, allowed) });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  const allowed = await getAllowedCorsOrigins();
  const headers = corsHeaders(origin, enabled, allowed);
  if (enabled && !originAllowed(origin, allowed)) {
    return NextResponse.json({ success: false, error: "Blocked by CORS: Origin not allowed" }, { status: 403, headers });
  }

  try {
    const rc = await requireAuthClientAdmin(request as unknown as import("next/server").NextRequest);
    if (!rc.ok) {
      const r = rc as { response: NextResponse };
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: r.response.status, headers }
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
