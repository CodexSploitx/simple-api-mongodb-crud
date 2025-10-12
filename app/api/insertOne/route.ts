import { NextRequest, NextResponse } from "next/server";
import { insertOneWithDynamicDB } from "../../../services/crudService";
import { authToken } from "../../../middleware/authToken";
import { validateJsonBodyMiddleware } from "../../../lib/requestValidation";
import { z, ZodError } from "zod";
import { ApiResponse } from "../../../types/mongo.d";

const insertOneRequestSchema = z.object({
  db: z
    .string()
    .min(1, "Database name is required")
    .regex(/^[a-zA-Z0-9_-]+$/, "Database name contains invalid characters"),
  collection: z
    .string()
    .min(1, "Collection name is required")
    .regex(/^[a-zA-Z0-9_-]+$/, "Collection name contains invalid characters"),
  document: z
    .record(z.string(), z.unknown())
    .refine((doc) => Object.keys(doc).length > 0, {
      message: "Document cannot be an empty object",
    })
    .refine((doc) => !doc._id, {
      message: "Cannot manually specify _id field",
    }),
});

export async function POST(req: NextRequest) {
  try {
    // Validate authentication
  const authResult = await authToken(req, "register");
    if (authResult !== null) {
      return authResult;
    }

    // Validate JSON body using our new utility
    const bodyValidation = await validateJsonBodyMiddleware(req);
    if (bodyValidation instanceof NextResponse) {
      return bodyValidation; // Return error response if validation failed
    }

    // Validate the request body using Zod
    const validatedBody = insertOneRequestSchema.parse(bodyValidation);
    const { db, collection, document } = validatedBody;

    const result = await insertOneWithDynamicDB(db, collection, document);

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        message: "Document inserted successfully",
        data: result,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      // Zod validation error
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: error.issues.map((issue) => issue.message).join(", "),
        },
        { status: 400 }
      );
    } else if (error instanceof Error) {
      // General error
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: error.message,
        },
        { status: 500 }
      );
    } else {
      // Unknown error
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          message: "An unknown error occurred",
        },
        { status: 500 }
      );
    }
  }
}
