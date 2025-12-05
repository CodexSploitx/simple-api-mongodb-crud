import { NextResponse } from "next/server";
import { corsHeaders, isCorsEnabled, getAllowedCorsOrigins, originAllowed } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_AUTH || "default-admin-secret";
const ADMIN_USERNAME = process.env.USERNAME_AUTH_CLIENT || "admin";
const ADMIN_PASSWORD = process.env.PASSWORD_AUTH_CLIENT || "admin123";

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
    return NextResponse.json({ success: false, error: "Blocked by CORS: Origin not allowed" }, { status: 403, headers });
  }

  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(ip, 5, 60000); // 5 attempts per minute

    const body = await request.json();
    const { username, password } = body;

    // Validate credentials
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: "Invalid credentials" },
        { status: 401, headers }
      );
    }

    // Generate admin token (1 hour expiry)
    const token = jwt.sign(
      { admin: true, username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return NextResponse.json(
      { success: true, token },
      { status: 200, headers }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: message },
      { status: message === "Too many requests, please try again later." ? 429 : 500, headers }
    );
  }
}
