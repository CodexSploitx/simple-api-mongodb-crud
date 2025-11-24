import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { RegisterSchema } from "@/lib/validations";
import { hashPassword, generateAccessToken, generateRefreshToken } from "@/lib/auth";
import { corsHeaders } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

const DB_NAME = process.env.AUTH_CLIENT_DB || "authclient";
const COLLECTION_NAME = process.env.AUTH_CLIENT_COLLECTION || "users";

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  try {
    // Rate Limit
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(ip, 5, 60000); // 5 requests per minute

    const body = await request.json();
    
    // Validation
    const result = RegisterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation error", details: result.error.flatten() },
        { status: 400, headers }
      );
    }

    const { email, username, password } = result.data;
    const collection = await getCollection(DB_NAME, COLLECTION_NAME);

    // Check if user exists
    const existingUser = await collection.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409, headers }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    const tokenVersion = 0;

    // Create user
    const newUser = {
      email,
      username,
      password: hashedPassword,
      tokenVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await collection.insertOne(newUser);
    const userId = insertResult.insertedId.toString();

    // Generate tokens
    const accessToken = generateAccessToken({ userId, email, username, version: tokenVersion });
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
        message: "User registered successfully",
        user: { id: userId, email, username },
        accessToken,
      },
      { status: 201, headers }
    );
  } catch (error: unknown) {
    console.error("Register error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage === "Too many requests, please try again later." ? 429 : 500, headers }
    );
  }
}
