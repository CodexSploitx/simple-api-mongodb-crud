import { NextResponse } from "next/server";
import { getCollection } from "@/lib/mongo";
import { corsHeaders } from "@/lib/cors";
import { hashPassword } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const collection = await getCollection(DB_NAME, COLLECTION_NAME);

    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404, headers }
      );
    }

    return NextResponse.json(
      { success: true, message: "User deleted successfully" },
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
