import { NextRequest, NextResponse } from "next/server";
import type { ErrorResponse } from "@/types/mongo";

// Mapeo de rutas y sus métodos permitidos
const ROUTE_METHODS: Record<string, string[]> = {
  '/api/[db]/[collection]': ['GET'],
  '/api/insertOne': ['POST'],
  // Agregar más rutas según sea necesario
};

// Mapeo de métodos y sus descripciones
const METHOD_DESCRIPTIONS: Record<string, string> = {
  'GET': 'para consultar/obtener datos',
  'POST': 'para crear/insertar datos',
  'PUT': 'para actualizar datos completos',
  'PATCH': 'para actualizar datos parciales',
  'DELETE': 'para eliminar datos'
};

export function validateHttpMethod(
  req: NextRequest,
  routePattern: string
): NextResponse<ErrorResponse> | null {
  const method = req.method;
  const allowedMethods = ROUTE_METHODS[routePattern];
  
  if (!allowedMethods) {
    // Si no está definida la ruta, permitir por defecto
    return null;
  }
  
  if (!allowedMethods.includes(method)) {
    const correctMethod = allowedMethods[0]; // Tomar el primer método como sugerencia
    const methodDescription = METHOD_DESCRIPTIONS[correctMethod] || '';
    
    const errorResponse: ErrorResponse = {
      success: false,
      error: "Método HTTP incorrecto",
      message: `Este endpoint requiere el método ${correctMethod} ${methodDescription}. Recibido: ${method}. Métodos permitidos: ${allowedMethods.join(', ')}`
    };
    
    return NextResponse.json(errorResponse, { status: 405 });
  }
  
  return null; // Método válido
}

// Función auxiliar para obtener el patrón de ruta desde la URL
export function getRoutePattern(pathname: string): string {
  // Convertir rutas dinámicas a patrones
  const pattern = pathname
    .replace(/\/api\/[^/]+\/[^/]+$/, '/api/[db]/[collection]')
    .replace(/\/api\/insertOne$/, '/api/insertOne');
  
  return pattern;
}