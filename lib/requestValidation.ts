import { NextRequest, NextResponse } from "next/server";
import { ApiResponse } from "../types/mongo.d";

/**
 * Validates that a request has a valid JSON body
 * @param req - The NextRequest object
 * @returns Promise<any> - The parsed JSON body or throws an error
 */
export async function validateJsonBody(
  req: NextRequest
): Promise<Record<string, unknown>> {
  try {
    // Check if the request has a body
    const contentLength = req.headers.get("content-length");
    if (!contentLength || contentLength === "0") {
      throw new Error("Request body is required");
    }

    // Check content-type header
    const contentType = req.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Content-Type must be application/json");
    }

    // Parse the JSON body
    const body = await req.json();

    // Check if body is empty object or null
    if (!body || (typeof body === "object" && Object.keys(body).length === 0)) {
      throw new Error("Request body cannot be empty");
    }

    return body;
  } catch (error: Error | unknown) {
    // If it's a JSON parsing error
    if (error instanceof SyntaxError) {
      throw new Error("Invalid JSON format in request body");
    }
    // Re-throw our custom errors
    throw error;
  }
}

/**
 * Creates a standardized error response for body validation failures
 * @param error - The error message
 * @param status - HTTP status code (default: 400)
 * @returns NextResponse with error details
 */
export function createBodyValidationErrorResponse(
  error: string,
  status: number = 400
): NextResponse {
  return NextResponse.json<ApiResponse>(
    {
      success: false,
      message: error,
    },
    { status }
  );
}

/**
 * Middleware function that validates JSON body and handles errors automatically
 * @param req - The NextRequest object
 * @returns Promise<any | NextResponse> - Returns parsed body or error response
 */
export async function validateJsonBodyMiddleware(
  req: NextRequest
): Promise<Record<string, unknown> | NextResponse> {
  try {
    return await validateJsonBody(req);
  } catch (error: Error | unknown) {
    return createBodyValidationErrorResponse(
      error instanceof Error ? error.message : "An unknown error occurred"
    );
  }
}
