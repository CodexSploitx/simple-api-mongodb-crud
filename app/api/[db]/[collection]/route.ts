import { NextRequest, NextResponse } from "next/server";
import { findDocuments } from "@/services/crudService";
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

interface PaginatedResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SuccessResponse<PaginatedResponse> | ErrorResponse>> {
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

    // 7. Extraer parámetros de query para paginación
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const requestedLimit = parseInt(searchParams.get('limit') || '50');
    
    // LÍMITE MÁXIMO DE SEGURIDAD: No más de 1000 registros por página
    const limit = Math.min(requestedLimit, 1000);
    const skip = (page - 1) * limit;

    // 8. Construir filtros de búsqueda
    const query: Document = {};
    
    // Soporte para búsquedas con regex (más eficiente)
    const searchField = searchParams.get('searchField');
    const searchValue = searchParams.get('searchValue');
    const useRegex = searchParams.get('regex') === 'true';
    
    if (searchField && searchValue) {
      if (useRegex) {
        // Usar regex con índices para mejor rendimiento
        query[searchField] = { 
          $regex: searchValue, 
          $options: 'i' // case insensitive
        };
      } else {
        // Búsqueda exacta (más rápida)
        query[searchField] = searchValue;
      }
    }

    // 9. Configurar ordenamiento
    const sortField = searchParams.get('sortField') || '_id';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;
    const sort = { [sortField]: sortOrder };

    // 10. Obtener documentos con paginación
    const result = await findDocuments(decodedDb, decodedCollection, query, {
      limit,
      skip,
      sort
    });

    // 11. Calcular metadatos de paginación
    // Para obtener el total real, necesitamos hacer una consulta de conteo
    const { getCollection } = await import('@/lib/mongo');
    const col = await getCollection(decodedDb, decodedCollection);
    const totalDocuments = await col.countDocuments(query);
    
    const totalPages = Math.ceil(totalDocuments / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginatedResponse: PaginatedResponse = {
      documents: result.documents,
      pagination: {
        page,
        limit,
        total: totalDocuments,
        totalPages,
        hasNext,
        hasPrev
      }
    };

    const successResponse: SuccessResponse<PaginatedResponse> = {
      success: true,
      data: paginatedResponse,
      message: `Página ${page} de ${totalPages}. Se encontraron ${result.documents.length} documentos de ${totalDocuments} totales en ${decodedDb}.${decodedCollection}`,
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