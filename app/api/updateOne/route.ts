import { NextRequest, NextResponse } from "next/server";
import { authToken } from "../../../middleware/authToken";
import { updateOneDocument } from "../../../services/crudService";
import type { UpdateOneRequest, ApiResponse, UpdateOneResponse } from "../../../types/mongo";
import { requireAuthClient, type RequireAuthClientOk, type RequireAuthClientError } from "../../../lib/auth";

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const useAuthClient = String(process.env.RELACIONALDB_AUTH_CLIENT || "false").toLowerCase() === "true";
    if (!useAuthClient) {
      const authResult = await authToken(request, "update");
      if (authResult !== null) {
        return authResult;
      }
    }

    // Parsear el cuerpo de la petición
    let body: UpdateOneRequest;
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
    const { db, collection, update } = body;
    let filter = body.filter;
    if (!db || !collection || !filter || !update) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Fields 'db', 'collection', 'filter', and 'update' are required"
        } as ApiResponse,
        { status: 400 }
      );
    }

    if (useAuthClient) {
      const auth = await requireAuthClient(request);
      if (!auth.ok) {
        const err = auth as RequireAuthClientError;
        return err.response;
      }
      const ok = auth as RequireAuthClientOk;
      filter = { ...filter, ownerId: ok.userId };
    }
    const result = await updateOneDocument({ db, collection, filter, update, options: body.options });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: result.modifiedCount > 0 
          ? "Document updated successfully" 
          : "No document was modified (document may not exist or no changes were needed)"
      } as ApiResponse<UpdateOneResponse>,
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in PUT /api/updateOne:', error);
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
      message: "Use PUT method to update documents"
    } as ApiResponse,
    { status: 405 }
  );
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "Use PUT method to update documents"
    } as ApiResponse,
    { status: 405 }
  );
}

export async function DELETE(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed",
      message: "Use PUT method to update documents"
    } as ApiResponse,
    { status: 405 }
  );
}