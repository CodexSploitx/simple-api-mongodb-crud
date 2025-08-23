import { NextRequest, NextResponse } from 'next/server';
import { deleteOneDocument } from '../../../services/crudService';
import { authToken } from '../../../middleware/authToken';
import type { DeleteOneRequest, ApiResponse, DeleteOneResponse } from '../../../types/mongo';

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Autenticación
    const authError = authToken(request);
    if (authError) {
      return NextResponse.json(authError, { status: 401 });
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
    const { db, collection, filter } = body;
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

    // Ejecutar la eliminación
    const result = await deleteOneDocument(body);

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