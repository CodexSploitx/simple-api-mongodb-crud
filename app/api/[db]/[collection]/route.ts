import { NextRequest, NextResponse } from "next/server";
import { findAllDocuments } from "@/services/crudService";
import { authToken } from "@/middleware/authToken";
import { validateForQuery } from "@/lib/mongo";
import { validateHttpMethod, getRoutePattern } from "@/lib/httpMethodValidator";
import type { ErrorResponse, SuccessResponse } from "@/types/mongo";
import { Document } from "mongodb";

interface RouteParams {
  params: Promise<{
    db: string;
    collection: string;
  }>;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse<Document[]> | ErrorResponse>> {
  try {
    // 1. Validar método HTTP
    const routePattern = getRoutePattern(req.nextUrl.pathname);
    const methodValidation = validateHttpMethod(req, routePattern);
    if (methodValidation) {
      return methodValidation;
    }

    // 2. Verificar autenticación
    const authResult = authToken(req);
    if (authResult !== null) {
      return authResult as NextResponse<ErrorResponse>;
    }

    // 3. Await params antes de usar sus propiedades
    const { db, collection } = await params;

    // 4. Validar parámetros
    if (!db || !collection) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Parámetros faltantes",
        message: "Se requieren los parámetros 'db' y 'collection'",
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // 5. Decodificar parámetros URL
    const decodedDb = decodeURIComponent(db);
    const decodedCollection = decodeURIComponent(collection);

    // 6. Validar existencia para consulta
    const validation = await validateForQuery(decodedDb, decodedCollection);
    if (!validation.valid) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: validation.error!,
        message: validation.message!,
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // 7. Obtener todos los documentos
    const documents = await findAllDocuments(decodedDb, decodedCollection);

    const successResponse: SuccessResponse<Document[]> = {
      success: true,
      data: documents,
      message: `Se encontraron ${documents.length} documentos en ${decodedDb}.${decodedCollection}`,
    };

    return NextResponse.json(successResponse, { status: 200 });

  } catch (error: unknown) {
    console.error("Error en GET documents:", error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: "Error interno del servidor",
      message: error instanceof Error ? error.message : "Error desconocido",
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// Manejar otros métodos HTTP no permitidos
export async function POST() {
  return NextResponse.json({
    success: false,
    error: "Método HTTP incorrecto",
    message: "Este endpoint requiere el método GET para consultar datos. Usa POST /api/insertOne para insertar datos."
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({
    success: false,
    error: "Método HTTP incorrecto", 
    message: "Este endpoint requiere el método GET para consultar datos."
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({
    success: false,
    error: "Método HTTP incorrecto",
    message: "Este endpoint requiere el método GET para consultar datos."
  }, { status: 405 });
}