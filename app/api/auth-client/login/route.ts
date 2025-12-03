import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { LoginSchema } from "@/lib/validations";
import { verifyPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";
import { corsHeaders, isCorsEnabled } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  return NextResponse.json({}, { headers: corsHeaders(origin, enabled) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const enabled = await isCorsEnabled();
  const headers = corsHeaders(origin, enabled);

  try {
    // Rate Limit
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(ip, 10, 60000); // 10 requests per minute for login

    const body = await request.json();
    
    // Validation
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", details: result.error.flatten() },
        { status: 400, headers }
      );
    }

    const { identifier, password } = result.data;
    const collection = await getCollection(DB_NAME, COLLECTION_NAME);

    // Find user by email or username
    const user = await collection.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers }
      );
    }

    // Check configuration: require email verification to login
    try {
      const { db: stmpDb, collection: stmpConfig } = getStmpEnv();
      const cfgCol = await getCollection(stmpDb, stmpConfig);
      const cfgDoc = await cfgCol.findOne({ key: "default" });
      const requireEmailVerificationLogin = Boolean(cfgDoc?.requireEmailVerificationLogin);
      if (requireEmailVerificationLogin && user.verifiEmail !== true) {
        return NextResponse.json(
          { error: "Email not verified" },
          { status: 403, headers }
        );
      }
    } catch {}

    // Generate tokens
    const tokenVersion = user.tokenVersion || 0;
    const userId = user._id.toString();
    const accessToken = generateAccessToken({ userId, email: user.email, username: user.username, version: tokenVersion });
    const refreshToken = generateRefreshToken({ userId, version: tokenVersion });

    // Set Refresh Token Cookie
    const cookieStore = await cookies();
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return NextResponse.json(
      {
        message: "Login successful",
        user: { id: userId, email: user.email, username: user.username },
        accessToken,
      },
      { status: 200, headers }
    );
  } catch (error: unknown) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage === "Too many requests, please try again later." ? 429 : 500, headers }
    );
  }
}
