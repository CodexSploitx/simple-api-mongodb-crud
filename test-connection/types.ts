/**
 * Configuración para tests
 */
export interface TestConfig {
  mongodb: {
    uri: string;
    testDb: string;
    testCollection: string;
    timeout: number;
  };
  api: {
    baseUrl: string;
    token: string;
    timeout: number;
  };
  logging: {
    level: LogLevel;
    colors: boolean;
    timestamp: boolean;
  };
}

/**
 * Niveles de logging
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  SUCCESS = 3,
  DEBUG = 4
}

/**
 * Opciones del logger
 */
export interface LoggerOptions {
  level: LogLevel;
  colors: boolean;
  timestamp: boolean;
}

/**
 * Resultado de un test individual
 */
export interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  error?: Error;
  context?: Record<string, unknown>;
}

/**
 * Suite de tests
 */
export interface TestSuite {
  name: string;
  tests: TestResult[];
  duration?: number;
}

/**
 * Resumen de ejecución de tests
 */
export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  suites: TestSuite[];
}

/**
 * Documento de prueba para API
 */
export interface ApiTestDocument {
  name: string;
  description: string;
  testId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Respuesta de API genérica
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

/**
 * Respuesta específica para operaciones de inserción
 */
export interface InsertResponse {
  insertedId: string;
  acknowledged: boolean;
}

/**
 * Respuesta específica para operaciones de actualización
 */
export interface UpdateResponse {
  modifiedCount: number;
  matchedCount: number;
  acknowledged: boolean;
}

/**
 * Respuesta específica para operaciones de eliminación
 */
export interface DeleteResponse {
  deletedCount: number;
  acknowledged: boolean;
}

/**
 * Respuesta específica para operaciones de búsqueda
 */
export interface FindResponse {
  documents: Record<string, unknown>[];
  count: number;
}

/**
 * Contexto de test de MongoDB
 */
export interface MongoTestContext {
  client: import('mongodb').MongoClient;
  db: import('mongodb').Db;
  collection?: import('mongodb').Collection;
}

/**
 * Clase de error personalizada para tests
 */
export class TestError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string = "TEST_ERROR", context?: Record<string, unknown>) {
    super(message);
    this.name = "TestError";
    this.code = code;
    this.context = context;
  }
}