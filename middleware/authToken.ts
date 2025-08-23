import { NextRequest, NextResponse } from "next/server";
import type { ErrorResponse } from "@/types/mongo";

export function authToken(req: NextRequest): NextResponse<ErrorResponse> | null {
  const authHeader: string | null = req.headers.get("authorization");
  const token: string | undefined = authHeader?.split(" ")[1];
  
  if (!token || token !== process.env.API_TOKEN) {
    const errorResponse: ErrorResponse = {
      success: false,
      error: "No autorizado",
      message: "Token de autenticación inválido o faltante"
    };
    return NextResponse.json(errorResponse, { status: 401 });
  }
  
  return null; // Autenticación exitosa
}
