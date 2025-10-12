import { NextRequest, NextResponse } from "next/server";
import type { ErrorResponse } from "@/types/mongo";
import { getCollection } from "@/lib/mongo";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

function resolveUsersEnv(): { USERS_DB: string; USERS_COLLECTION: string } {
  const USERS_DB =
    process.env.USERS_DB ||
    process.env.USER_DB ||
    process.env.AUTH_DB_USERS ||
    process.env.AUTH_DB ||
    "";
  const USERS_COLLECTION =
    process.env.USERS_COLLECTION ||
    process.env.USER_COLLECTION ||
    process.env.AUTH_DB_COLLECTION ||
    process.env.AUTH_COLLECTION ||
    "";
  return { USERS_DB, USERS_COLLECTION };
}

export type AuthOperation = "register" | "delete" | "update" | "find";

export async function authToken(
  req: NextRequest,
  operation: AuthOperation
): Promise<NextResponse<ErrorResponse> | null> {
  const { USERS_DB, USERS_COLLECTION } = resolveUsersEnv();
  if (!USERS_DB || !USERS_COLLECTION) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: "No autorizado",
      message: "Configuración de usuarios faltante",
    };
    return NextResponse.json(errorResponse, { status: 401 });
  }

  try {
    const collection = await getCollection(USERS_DB, USERS_COLLECTION);

    // 1) Intentar autenticación vía cookie JWT (escenario web/page.tsx)
    const jwtCookie = req.cookies.get("auth_token")?.value;
    if (jwtCookie) {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        const errorResponse: ErrorResponse = {
          success: false,
          error: "Missing configuration",
          message: "JWT_SECRET not configured in environment variables",
        };
        return NextResponse.json(errorResponse, { status: 500 });
      }
      try {
        const payload = jwt.verify(jwtCookie, secret) as { _id?: string } | string;
        const userId = typeof payload === "string" ? undefined : payload?._id;
        if (!userId) {
          const errorResponse: ErrorResponse = {
            success: false,
            error: "Missing authentication",
            message: "JWT invalid: '_id' field is missing",
          };
          return NextResponse.json(errorResponse, { status: 401 });
        }

        // Buscar usuario por _id
        if (!ObjectId.isValid(userId)) {
          const errorResponse: ErrorResponse = {
            success: false,
            error: "Missing authentication",
            message: "JWT invalid: '_id' field is not a valid ObjectId",
          };
          return NextResponse.json(errorResponse, { status: 401 });
        }
        const objectId = new ObjectId(userId);
        const user = await collection.findOne({ _id: objectId });

        if (!user) {
          const errorResponse: ErrorResponse = {
            success: false,
            error: "Missing authentication",
            message: "User not found for the provided JWT",
          };
          return NextResponse.json(errorResponse, { status: 401 });
        }

        const hasPermission = Boolean(user.permissions?.[operation] === true);
        if (!hasPermission) {
          const errorResponse: ErrorResponse = {
            success: false,
            error: "Missing permissions",
            message: `The user does not have permission to perform the operation '${operation}'`,
          };
          return NextResponse.json(errorResponse, { status: 403 });
        }

        return null; // Autorizado por cookie JWT
      } catch (err) {
        // Si falla la verificación del JWT, continuar con Bearer si existe
        console.warn("JWT verification failed in cookie:", err instanceof Error ? err.message : err);
      }
    }

    // 2) Intentar autenticación vía Authorization: Bearer <token> (escenario HTTP client)
    const authHeader: string | null = req.headers.get("authorization");
    const token: string | undefined = authHeader?.split(" ")[1];

    // Permitir bypass por API_TOKEN de entorno (si corresponde)
    if (token && token === process.env.API_TOKEN) {
      return null;
    }

    if (!token) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing authentication",
        message: "Bearer token is invalid or missing",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Intentar primero con hash del token (flujo normal: se envía el token plano)
    const computedHash = crypto.createHash("sha256").update(token).digest("hex");
    let user = await collection.findOne({
      apiTokens: { $elemMatch: { tokenHash: computedHash, revoked: false } },
    });

    // Si no se encuentra y el token parece ya ser un hash SHA-256 en hex, intentar coincidencia directa
    const looksLikeHexHash = /^[a-f0-9]{64}$/i.test(token);
    if (!user && looksLikeHexHash) {
      user = await collection.findOne({
        apiTokens: { $elemMatch: { tokenHash: token, revoked: false } },
      });
    }

    if (!user) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing authentication",
        message: "Bearer token is invalid or not associated with a user",
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    const hasPermission = Boolean(user.permissions?.[operation] === true);
    if (!hasPermission) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Missing permissions",
        message: `The user does not have permission to perform the operation '${operation}'`,
      };
      return NextResponse.json(errorResponse, { status: 403 });
    }

    return null; // Autorizado por Bearer token

  } catch (err) {
    console.error("Error in authentication:", err);
    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal error",
      message: err instanceof Error ? err.message : "Unknown error in authentication",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
