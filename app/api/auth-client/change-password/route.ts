import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { ChangePasswordSchema } from "@/lib/validations";
import { verifyPassword, hashPassword, generateAccessToken, generateRefreshToken, verifyToken, verifyReauthToken } from "@/lib/auth";
import { getStmpEnv } from "@/lib/stmp";
import { corsHeaders } from "@/lib/cors";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

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
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    checkRateLimit(ip, 5, 60000);

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization token missing" },
        { status: 401, headers }
      );
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 401, headers }
      );
    }

    const body = await request.json();
    const validation = ChangePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation error", details: validation.error.flatten() },
        { status: 400, headers }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    const { db, collection: stmpConfig } = getStmpEnv();
    const cfgCol = await getCollection(db, stmpConfig);
    const cfg = await cfgCol.findOne({ key: "default" });
    const needReauth = Boolean(cfg?.requireReauthChangePassword);
    if (needReauth) {
      const rt = request.headers.get("x-reauth-token") || "";
      const rp = rt ? verifyReauthToken(rt) : null;
      const okReauth = Boolean(rp && rp.userId === payload.userId && (!rp.action || rp.action === "change_password"));
      if (!okReauth) {
        return NextResponse.json(
          { error: "Reauthentication required" },
          { status: 401, headers }
        );
      }
    }

    const collection = await getCollection(DB_NAME, COLLECTION_NAME);
    const user = await collection.findOne({ _id: new ObjectId(payload.userId) });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 401, headers }
      );
    }

    if (typeof user.tokenVersion === "number" && user.tokenVersion !== payload.version) {
      return NextResponse.json(
        { error: "Token revoked" },
        { status: 403, headers }
      );
    }

    const ok = await verifyPassword(currentPassword, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401, headers }
      );
    }

    const hashed = await hashPassword(newPassword);
    const newVersion = (user.tokenVersion || 0) + 1;

    const update = await collection.updateOne(
      { _id: new ObjectId(payload.userId) },
      {
        $set: { password: hashed, updatedAt: new Date() },
        $inc: { tokenVersion: 1 },
      }
    );

    if (update.matchedCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers }
      );
    }

    const accessToken = generateAccessToken({ userId: payload.userId, email: user.email, username: user.username, version: newVersion });
    const refreshToken = generateRefreshToken({ userId: payload.userId, version: newVersion });

    const cookieStore = await cookies();
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return NextResponse.json(
      {
        message: "Password updated successfully",
        accessToken,
      },
      { status: 200, headers }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: message === "Too many requests, please try again later." ? 429 : 500, headers }
    );
  }
}
