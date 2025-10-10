import { ApiTestDocument } from "./types.js";

/**
 * Utilidades auxiliares para los tests
 */
export class TestUtils {
  
  /**
   * Genera un documento de prueba para tests de API
   */
  public static generateTestDocument(overrides?: Partial<ApiTestDocument>): ApiTestDocument {
    const baseDoc: ApiTestDocument = {
      name: `Test Document ${Date.now()}`,
      description: "Documento generado para testing",
      testId: this.generateRandomId(),
      timestamp: new Date().toISOString(),
      data: {
        testValue: Math.floor(Math.random() * 1000),
        active: true
      }
    };
    
    return { ...baseDoc, ...overrides };
  }

  /**
   * Genera un ID aleatorio único
   */
  public static generateRandomId(length: number = 8): string {
    return Math.random().toString(36).substring(2, 2 + length);
  }

  /**
   * Espera un tiempo determinado (para tests de timing)
   */
  public static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Mide el tiempo de ejecución de una función
   */
  public static async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    
    return { result, duration };
  }

  /**
   * Reintenta una operación hasta N veces
   */
  public static async retry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await operation();
        } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxAttempts) {
          await this.sleep(delayMs);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Valida la estructura de una respuesta de API
   */
  public static validateApiResponse(response: Record<string, unknown>, requiredFields: string[]): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    // Verificar campos básicos
    const hasBasicStructure = 'success' in response;
    
    if (!hasBasicStructure) {
      return false;
    }

    // Verificar campos específicos si se proporcionan
    if (requiredFields.length > 0) {
      return requiredFields.every(field => field in response);
    }

    return true;
  }

  /**
   * Sanitiza datos sensibles para logging
   */
  public static sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***HIDDEN***';
      }
    }

    return sanitized;
  }

  /**
   * Formatea bytes en una representación legible
   */
  public static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Formatea duración en milisegundos a una representación legible
   */
  public static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(2)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(2);
      return `${minutes}m ${seconds}s`;
    }
  }

  /**
   * Compara dos objetos profundamente
   */
  public static deepEqual(obj1: Record<string, unknown>, obj2: Record<string, unknown>): boolean {
    if (obj1 === obj2) {
      return true;
    }

    if (obj1 == null || obj2 == null) {
      return false;
    }

    if (typeof obj1 !== typeof obj2) {
      return false;
    }

    if (typeof obj1 !== 'object') {
      return obj1 === obj2;
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false;
    }

    for (const key of keys1) {
      if (!keys2.includes(key)) {
        return false;
      }
      
      const val1 = obj1[key];
      const val2 = obj2[key];
      
      if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null) {
        if (!this.deepEqual(val1 as Record<string, unknown>, val2 as Record<string, unknown>)) {
          return false;
        }
      } else if (val1 !== val2) {
        return false;
      }
    }

    return true;
  }

  /**
   * Crea un timeout que rechaza una promesa después del tiempo especificado
   */
  public static withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  /**
   * Valida que un string sea un ObjectId válido de MongoDB
   */
  public static isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Genera estadísticas básicas de un array de números
   */
  public static getStats(numbers: number[]): {
    min: number;
    max: number;
    avg: number;
    median: number;
    total: number;
  } {
    if (numbers.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, total: 0 };
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const total = numbers.reduce((sum, n) => sum + n, 0);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: total / numbers.length,
      median: sorted[Math.floor(sorted.length / 2)],
      total
    };
  }
}