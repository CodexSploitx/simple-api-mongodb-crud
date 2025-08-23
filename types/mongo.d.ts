import { Document, ObjectId, FindOneAndDeleteOptions } from "mongodb";

export interface InsertOneRequest {
  db: string;
  collection: string;
  document: Document;
}

export interface FindRequest {
  db: string;
  collection: string;
  query?: Document;
  options?: {
    limit?: number;
    skip?: number;
    sort?: Document;
    projection?: Document;
  };
}

export interface FindOneRequest {
  db: string;
  collection: string;
  query: Document;
  options?: {
    projection?: Document;
  };
}

export interface FindResponse {
  documents: Document[];
  count: number;
}

export interface FindOneResponse {
  document: Document | null;
  found: boolean;
}

export interface InsertOneResponse {
  insertedId: ObjectId;
  acknowledged: boolean;
}

export interface UpdateOneRequest {
  db: string;
  collection: string;
  filter: Document;
  update: Document;
  options?: {
    upsert?: boolean;
    arrayFilters?: Document[];
  };
}

export interface UpdateOneResponse {
  matchedCount: number;
  modifiedCount: number;
  acknowledged: boolean;
  upsertedId?: ObjectId | null;
  document?: Document | null; // Nuevo campo para el documento actualizado
}

export interface DeleteOneRequest {
  db: string;
  collection: string;
  filter: Document;
  options?: FindOneAndDeleteOptions;
}

export interface DeleteOneResponse {
  deletedCount: number;
  acknowledged: boolean;
  document?: Document | null; // El documento eliminado (si se usa findOneAndDelete)
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}
