import { NextRequest, NextResponse } from "next/server";
import { authToken } from "../../../middleware/authToken";
import { findDocuments } from "../../../services/crudService";
import { validateHttpMethod } from "../../../lib/httpMethodValidator";
import { validateForQuery } from "../../../lib/mongo";
import { FindRequest, FindResponse, ErrorResponse, SuccessResponse } from "../../../types/mongo";
import { requireAuthClient, isAuthClientModeEnabled, type RequireAuthClientOk, type RequireAuthClientError } from "../../../lib/auth";

export async function POST(
  request: NextRequest
): Promise<NextResponse<SuccessResponse<FindResponse> | ErrorResponse>> {
  try {
    // Validar método HTTP
    const methodValidation = validateHttpMethod(request, "/api/find");
    if (methodValidation) return methodValidation;

    const useAuthClient = await isAuthClientModeEnabled();
    let authClientOk: RequireAuthClientOk | null = null;
    if (useAuthClient) {
      const rc = await requireAuthClient(request);
      if (!rc.ok) return (rc as RequireAuthClientError).response as NextResponse<ErrorResponse>;
      authClientOk = rc as RequireAuthClientOk;
    } else {
      const systemAuth = await authToken(request, "find");
      if (systemAuth !== null) return systemAuth;
    }

    // Parsear el cuerpo de la solicitud
    let body: FindRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: "Invalid JSON",
          message: "El cuerpo de la solicitud debe ser un JSON válido"
        },
        { status: 400 }
      );
    }

    // Validar campos requeridos
    if (!body.db || !body.collection) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: "Missing required fields",
          message: "Los campos 'db' y 'collection' son requeridos"
        },
        { status: 400 }
      );
    }

    // Validar existencia de base de datos y colección
    const validation = await validateForQuery(body.db, body.collection);
    if (!validation.valid) {
      return NextResponse.json<ErrorResponse>(
        {
          success: false,
          error: validation.error || "Validation failed",
          message: validation.message || "Error de validación"
        },
        { status: 404 }
      );
    }

    let query = body.query || {};
    if (authClientOk) {
      query = { ...query, ownerId: authClientOk.userId };
    }
    const result = await findDocuments(body.db, body.collection, query, body.options || {});

    return NextResponse.json<SuccessResponse<FindResponse>>(
      {
        success: true,
        data: result,
        message: `Se encontraron ${result.count} documentos en ${body.collection}`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error en /api/find:", error);
    return NextResponse.json<ErrorResponse>(
      {
        success: false,
        error: "Internal server error",
        message: "Error interno del servidor al buscar documentos"
      },
      { status: 500 }
    );
  }
}

// Manejar otros métodos HTTP
export async function GET() {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: "Method not allowed",
      message: "Este endpoint solo acepta POST. Usa POST /api/find con un cuerpo JSON que contenga: { db, collection, query?, options? }"
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: "Method not allowed",
      message: "Este endpoint solo acepta POST. Usa POST /api/find con un cuerpo JSON que contenga: { db, collection, query?, options? }"
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json<ErrorResponse>(
    {
      success: false,
      error: "Method not allowed",
      message: "Este endpoint solo acepta POST. Usa POST /api/find con un cuerpo JSON que contenga: { db, collection, query?, options? }"
    },
    { status: 405 }
  );
}
