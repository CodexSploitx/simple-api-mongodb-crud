import { NextRequest, NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import type { ErrorResponse, SuccessResponse } from "@/types/mongo";

function resolveUsersEnv() {
  const db =
    process.env.USERS_DB ||
    process.env.USER_DB ||
    process.env.AUTH_DB_USERS ||
    process.env.AUTH_DB ||
    "";
  const collection =
    process.env.USERS_COLLECTION ||
    process.env.USER_COLLECTION ||
    process.env.AUTH_DB_COLLECTION ||
    process.env.AUTH_COLLECTION ||
    "";
  return { db, collection };
}

export async function GET(req: NextRequest) {
  try {
    const { db, collection } = resolveUsersEnv();
    if (!db || !collection) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: "Missing configuration",
          message:
            "Missing USERS_DB/USER_DB/AUTH_DB_USERS/AUTH_DB or USERS_COLLECTION/USER_COLLECTION/AUTH_DB_COLLECTION/AUTH_COLLECTION environment variables",
        },
        { status: 500 }
      );
    }

    const jwtCookie = req.cookies.get("auth_token")?.value;
    if (!jwtCookie) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: "Missing authentication",
          message: "No auth_token cookie found",
        },
        { status: 401 }
      );
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: "Missing configuration",
          message: "JWT_SECRET not configured",
        },
        { status: 500 }
      );
    }

    let userId: string | undefined;
    try {
      const payload = jwt.verify(jwtCookie, secret) as { _id?: string } | string;
      userId = typeof payload === "string" ? undefined : payload?._id;
    } catch  {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: "Invalid token",
          message: "JWT verification failed",
        },
        { status: 401 }
      );
    }

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: "Invalid user",
          message: "Invalid or missing user id in token",
        },
        { status: 401 }
      );
    }

    const col = await getCollection(db, collection);
    const user = await col.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: "User not found",
          message: "No user found for token",
        },
        { status: 404 }
      );
    }

    const safeUser = {
      _id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };

    return NextResponse.json<SuccessResponse<typeof safeUser>>(
      {
        success: true,
        data: safeUser,
        message: "User retrieved",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/auth/me:", error);
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: "Method not allowed",
      message: "This endpoint only accepts GET requests",
    },
    { status: 405 }
  );
}