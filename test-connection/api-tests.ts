import { config } from "./test-config.ts";
import { TestLogger } from "./test-logger.ts";
import { TestUtils } from "./utils.ts";
import { 
  TestResult, 
  TestSuite, 
  TestError, 
  ApiResponse, 
  InsertResponse, 
  UpdateResponse, 
  DeleteResponse, 
  FindResponse,
  ApiTestDocument 
} from "./types.ts";

/**
 * Suite de tests para API endpoints
 */
export class ApiTests {
  private baseUrl: string;
  private token: string;
  private timeout: number;
  private testDocument: ApiTestDocument;
  private insertedDocumentId: string | null = null;
  private logger: TestLogger;

  constructor() {
    const { api } = config.config;
    this.baseUrl = api.baseUrl;
    this.token = api.token;
    this.timeout = api.timeout;
    this.logger = TestLogger.getInstance(config.config.logging);
    
    this.testDocument = TestUtils.generateTestDocument({
      name: "API Test Document",
      description: "Test document for API endpoints testing"
    });
  }

  /**
   * Ejecuta todos los tests de API
   */
  public async runAll(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: "API Endpoints Tests",
      tests: []
    };

    this.logger.header("API ENDPOINTS TESTS");

    // Validar token
    if (!this.token) {
      this.logger.warning("API_TOKEN not found in .env.local - using test token");
    }

    try {
      // Tests secuenciales (algunos dependen de otros)
      const sequentialTests = [
        () => this.testInsertOne(),
        () => this.testFindOne(),
        () => this.testFind(),
        () => this.testUpdateOne(),
        () => this.testGetAll(),
        () => this.testDeleteOne()
      ];

      for (const test of sequentialTests) {
        const result = await this.runSingleTest(test);
        suite.tests.push(result);
        
        // Si un test crítico falla, detener la ejecución
        if (result.status === 'failed' && this.isCriticalTest(result.name)) {
          this.logger.error(`Critical test failed: ${result.name}. Stopping execution.`);
          break;
        }
      }

      // Tests paralelos (independientes)
      const parallelTests = [
        () => this.testInvalidEndpoint(),
        () => this.testUnauthorizedAccess(),
        () => this.testInvalidPayload()
      ];

      const parallelResults = await Promise.allSettled(
        parallelTests.map(test => this.runSingleTest(test))
      );

      parallelResults.forEach(result => {
        if (result.status === 'fulfilled') {
          suite.tests.push(result.value);
        } else {
          suite.tests.push({
            name: "Parallel Test",
            status: "failed",
            duration: 0,
            error: new Error(result.reason)
          });
        }
      });

    } catch (error) {
      this.logger.error("Error in API tests", error as Error);
      suite.tests.push({
        name: "API Tests Setup",
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      });
    }

    return suite;
  }

  /**
   * Ejecuta un test individual con timeout y manejo de errores
   */
  private async runSingleTest(testFn: () => Promise<TestResult>): Promise<TestResult> {
    try {
      const { result, duration } = await TestUtils.measureTime(() => 
        TestUtils.withTimeout(testFn(), this.timeout)
      );
      return { ...result, duration };
    } catch (error) {
      return {
        name: "Unknown API Test",
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Determina si un test es crítico para la continuación de otros tests
   */
  private isCriticalTest(testName: string): boolean {
    const criticalTests = ["POST /api/insertOne"];
    return criticalTests.includes(testName);
  }

  /**
   * Test POST /api/insertOne
   */
  private async testInsertOne(): Promise<TestResult> {
     const testName = "POST /api/insertOne";
     this.logger.testProgress(testName, 'running');

    try {
      const { mongodb } = config.config;
      
      const response = await fetch(`${this.baseUrl}/api/insertOne`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          db: mongodb.testDb,
          collection: mongodb.testCollection,
          document: this.testDocument,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TestError(
          `HTTP ${response.status}: ${errorText}`,
          "HTTP_ERROR",
          { status: response.status, body: errorText }
        );
      }

      const result: ApiResponse<InsertResponse> = await response.json();
      
      if (!TestUtils.validateApiResponse(result as unknown as Record<string, unknown>, ['success', 'data'])) {
         throw new TestError("Invalid API response format", "INVALID_RESPONSE", result as unknown as Record<string, unknown>);
       }

       if (!result.success || !result.data?.insertedId) {
         throw new TestError("Insert operation failed", "INSERT_FAILED", result as unknown as Record<string, unknown>);
       }

      this.insertedDocumentId = result.data.insertedId;
       
       this.logger.testProgress(testName, 'passed');
       this.logger.info(`Document successfully inserted with ID: ${this.insertedDocumentId}`);
      
      return {
        name: testName,
        status: "passed",
        duration: 0,
        context: { insertedId: this.insertedDocumentId }
      };
    } catch (error) {
       this.logger.testProgress(testName, 'failed');
       return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test POST /api/findOne
   */
  private async testFindOne(): Promise<TestResult> {
     const testName = "POST /api/findOne";
     this.logger.testProgress(testName, 'running');

    try {
      if (!this.insertedDocumentId) {
        throw new TestError("No document ID available from insert test", "NO_DOCUMENT_ID");
      }

      const { mongodb } = config.config;
      
      const response = await fetch(`${this.baseUrl}/api/findOne`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          db: mongodb.testDb,
          collection: mongodb.testCollection,
          query: { _id: this.insertedDocumentId },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TestError(`HTTP ${response.status}: ${errorText}`, "HTTP_ERROR");
      }

      const result: ApiResponse<Record<string, unknown>> = await response.json();
      
      if (!result.success || !result.data) {
         throw new TestError("FindOne operation failed", "FINDONE_FAILED", result as unknown as Record<string, unknown>);
       }
 
       this.logger.testProgress(testName, 'passed');
       this.logger.info(`Document successfully found: ${(result.data as Record<string, unknown>).name || "No name"}`);
      
      return {
        name: testName,
        status: "passed",
        duration: 0,
        context: { document: TestUtils.sanitizeForLogging(result.data as Record<string, unknown>) }
      };
    } catch (error) {
       this.logger.testProgress(testName, 'failed');
       return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test POST /api/find
   */
  private async testFind(): Promise<TestResult> {
     const testName = "POST /api/find";
     this.logger.testProgress(testName, 'running');

    try {
      const { mongodb } = config.config;
      
      const response = await fetch(`${this.baseUrl}/api/find`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          db: mongodb.testDb,
          collection: mongodb.testCollection,
          query: { testId: this.testDocument.testId },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TestError(`HTTP ${response.status}: ${errorText}`, "HTTP_ERROR");
      }

      const result: ApiResponse<FindResponse> = await response.json();
      
      if (!result.success) {
         throw new TestError("Find operation failed", "FIND_FAILED", result as unknown as Record<string, unknown>);
       }

      const documentsCount = result.data?.documents?.length || 0;
       
       this.logger.testProgress(testName, 'passed');
       this.logger.info(`Successfully found ${documentsCount} documents`);
      
      return {
        name: testName,
        status: "passed",
        duration: 0,
        context: { documentsFound: documentsCount }
      };
    } catch (error) {
       this.logger.testProgress(testName, 'failed');
       return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test PUT /api/updateOne
   */
  private async testUpdateOne(): Promise<TestResult> {
     const testName = "PUT /api/updateOne";
     this.logger.testProgress(testName, 'running');

    try {
      if (!this.insertedDocumentId) {
        throw new TestError("No document ID available", "NO_DOCUMENT_ID");
      }

      const { mongodb } = config.config;
      
      const response = await fetch(`${this.baseUrl}/api/updateOne`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          db: mongodb.testDb,
          collection: mongodb.testCollection,
          filter: { _id: this.insertedDocumentId },
          update: {
            $set: {
              updated: true,
              updateTime: new Date().toISOString(),
              version: 2,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TestError(`HTTP ${response.status}: ${errorText}`, "HTTP_ERROR");
      }

      const result: ApiResponse<UpdateResponse> = await response.json();
      
      if (!result.success || result.data?.modifiedCount !== 1) {
         throw new TestError("Update operation failed", "UPDATE_FAILED", result as unknown as Record<string, unknown>);
       }
 
       this.logger.testProgress(testName, 'passed');
       this.logger.info(`Successfully updated ${result.data.modifiedCount} document`);
      
      return {
        name: testName,
        status: "passed",
        duration: 0,
        context: { modifiedCount: result.data.modifiedCount }
      };
        } catch (error) {
       this.logger.testProgress(testName, 'failed');
       return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test GET /api/[db]/[collection]
   */
  private async testGetAll(): Promise<TestResult> {
     const testName = "GET /api/[db]/[collection]";
     this.logger.testProgress(testName, 'running');

    try {
      const { mongodb } = config.config;
      
      const response = await fetch(
        `${this.baseUrl}/api/${mongodb.testDb}/${mongodb.testCollection}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${this.token}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new TestError(`HTTP ${response.status}: ${errorText}`, "HTTP_ERROR");
      }

      const result: ApiResponse<FindResponse> = await response.json();
      
      if (!result.success) {
         throw new TestError("GetAll operation failed", "GETALL_FAILED", result as unknown as Record<string, unknown>);
       }

      const count = result.count || 0;
       
       this.logger.testProgress(testName, 'passed');
       this.logger.info(`Successfully obtained ${count} documents`);
      
      return {
        name: testName,
        status: "passed",
        duration: 0,
        context: { documentsCount: count }
      };
    } catch (error) {
      this.logger.testProgress(testName, 'failed');
      return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test DELETE /api/deleteOne
   */
  private async testDeleteOne(): Promise<TestResult> {
    const testName = "DELETE /api/deleteOne";
    this.logger.testProgress(testName, 'running');

    try {
      if (!this.insertedDocumentId) {
        throw new TestError("No document ID available", "NO_DOCUMENT_ID");
      }

      const { mongodb } = config.config;
      
      const response = await fetch(`${this.baseUrl}/api/deleteOne`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          db: mongodb.testDb,
          collection: mongodb.testCollection,
          filter: { _id: this.insertedDocumentId },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TestError(`HTTP ${response.status}: ${errorText}`, "HTTP_ERROR");
      }

      const result: ApiResponse<DeleteResponse> = await response.json();
      
      if (!result.success || !result.data?.deletedCount) {
         throw new TestError("Delete operation failed", "DELETE_FAILED", result as unknown as Record<string, unknown>);
       }

      // Limpiar ID después del delete exitoso
       this.insertedDocumentId = null;
       
       this.logger.testProgress(testName, 'passed');
       this.logger.info(`Deleted documents: ${result.data.deletedCount}`);
      
      return {
        name: testName,
        status: "passed",
        duration: 0,
        context: { deletedCount: result.data.deletedCount }
      };
    } catch (error) {
       this.logger.testProgress(testName, 'failed');
       return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test de endpoint inválido
   */
  private async testInvalidEndpoint(): Promise<TestResult> {
    const testName = "Invalid Endpoint Test";
    this.logger.testProgress(testName, 'running');

    try {
      const response = await fetch(`${this.baseUrl}/api/nonexistent`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.token}`,
        },
      });

      // Esperamos que falle (404)
      if (response.status !== 404) {
        throw new TestError(
          `Expected 404, got ${response.status}`,
          "UNEXPECTED_STATUS",
          { expectedStatus: 404, actualStatus: response.status }
        );
      }

      this.logger.testProgress(testName, 'passed');
      this.logger.info("Invalid endpoint correctly rejected");
      
      return {
        name: testName,
        status: "passed",
        duration: 0
      };
    } catch (error) {
       this.logger.testProgress(testName, 'failed');
       return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test de acceso no autorizado
   */
  private async testUnauthorizedAccess(): Promise<TestResult> {
    const testName = "Unauthorized Access Test";
    this.logger.testProgress(testName, 'running');

    try {
      const response = await fetch(`${this.baseUrl}/api/insertOne`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Sin token de autorización
        },
        body: JSON.stringify({
          db: "test",
          collection: "test",
          document: { test: true },
        }),
      });

      // Esperamos que falle (401 o 403)
      if (response.status !== 401 && response.status !== 403) {
        throw new TestError(
          `Expected 401/403, got ${response.status}`,
          "UNEXPECTED_STATUS",
          { expectedStatus: "401 or 403", actualStatus: response.status }
        );
      }

     this.logger.testProgress(testName, 'passed');
      this.logger.info("Unauthorized access correctly rejected");
      
      return {
        name: testName,
        status: "passed",
        duration: 0
      };
    } catch (error) {
      this.logger.testProgress(testName, 'failed');
      return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test de payload inválido
   */
  private async testInvalidPayload(): Promise<TestResult> {
    const testName = "Invalid Payload Test";
    this.logger.testProgress(testName, 'running');

    try {
      const response = await fetch(`${this.baseUrl}/api/insertOne`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          // Payload inválido - falta información requerida
          invalidField: "test"
        }),
      });

      // Esperamos que falle (400)
      if (response.status !== 400) {
        throw new TestError(
          `Expected 400, got ${response.status}`,
          "UNEXPECTED_STATUS",
          { expectedStatus: 400, actualStatus: response.status }
        );
      }

      this.logger.testProgress(testName, 'passed');
      this.logger.info("Invalid payload correctly rejected");
      
      return {
        name: testName,
        status: "passed",
        duration: 0
      };
    } catch (error) {
      this.logger.testProgress(testName, 'failed');
      return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}