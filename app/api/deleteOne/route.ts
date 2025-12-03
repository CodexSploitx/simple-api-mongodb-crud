import { NextRequest, NextResponse } from 'next/server';
import { deleteOneDocument } from '../../../services/crudService';
import { authToken } from '../../../middleware/authToken';
import type { DeleteOneRequest, ApiResponse, DeleteOneResponse } from '../../../types/mongo';
import { requireAuthClient, isAuthClientModeEnabled, type RequireAuthClientOk, type RequireAuthClientError } from '../../../lib/auth';

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const useAuthClient = await isAuthClientModeEnabled();
    let authClientOk: RequireAuthClientOk | null = null;
    if (useAuthClient) {
      const rc = await requireAuthClient(request);
      if (!rc.ok) return (rc as RequireAuthClientError).response;
      authClientOk = rc as RequireAuthClientOk;
    } else {
      const systemAuth = await authToken(request, 'delete');
      if (systemAuth !== null) return systemAuth;
    }

    // Parsear el cuerpo de la solicitud
    let body: DeleteOneRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON",
          message: "Request body must be valid JSON"
        } as ApiResponse,
        { status: 400 }
      );
    }

    // Validar campos requeridos
    const { db, collection } = body;
    let filter = body.filter;
    if (!db || !collection || !filter) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Fields 'db', 'collection', and 'filter' are required"
        } as ApiResponse,
        { status: 400 }
      );
    }

    if (authClientOk) {
      filter = { ...filter, ownerId: authClientOk.userId };
    }
    const result = await deleteOneDocument({ db, collection, filter, options: body.options });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: result.deletedCount > 0 ? "Document deleted successfully" : "No document found matching the filter"
      } as ApiResponse<DeleteOneResponse>,
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in DELETE /api/deleteOne:', error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// Manejar otros métodos HTTP
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "Use DELETE method to delete documents"
    } as ApiResponse,
    { status: 405 }
  );
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "Use DELETE method to delete documents"
    } as ApiResponse,
    { status: 405 }
  );
}

export async function PUT(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "Use DELETE method to delete documents"
    } as ApiResponse,
    { status: 405 }
  );
}
