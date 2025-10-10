import { MongoClient } from "mongodb";
import {
  validateDbAndCollectionNames,
  databaseExists,
  collectionExists,
  createDatabaseAndCollection,
} from "../lib/mongo.js";
import { config } from "./test-config.js";
import { logger } from "./test-logger.js";
import { TestUtils } from "./utils.js";
import { TestResult, TestSuite, MongoTestContext, TestError } from "./types.js";

/**
 * Test suite for MongoDB
 */
export class MongoTests {
  private client: MongoClient | null = null;
  private context: MongoTestContext | null = null;

  /**
   * Runs all MongoDB tests
   */
  public async runAll(): Promise<TestSuite> {
    const suite: TestSuite = {
      name: "MongoDB Tests",
      tests: []
    };

    logger.header("MONGODB TESTS");

    try {
      // Setup
      await this.setup();

      // Execute individual tests
      const tests = [
        () => this.testConnection(),
        () => this.testNameValidation(),
        () => this.testDatabaseExistence(),
        () => this.testCollectionCreation(),
        () => this.testBasicOperations()
      ];

      for (const test of tests) {
        const result = await this.runSingleTest(test);
        suite.tests.push(result);
      }

    } catch (error) {
      logger.error("Error in MongoDB tests setup", error as Error);
      suite.tests.push({
        name: "MongoDB Setup",
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      });
    } finally {
      // Cleanup
      await this.teardown();
    }

    return suite;
  }

  /**
   * Initial setup for tests
   */
  private async setup(): Promise<void> {
    logger.info("Setting up MongoDB tests...");
    
    const { mongodb } = config.config;
    
    try {
      this.client = new MongoClient(mongodb.uri);
      await this.client.connect();
      
      this.context = {
        client: this.client,
        db: this.client.db(mongodb.testDb),
        collection: this.client.db(mongodb.testDb).collection(mongodb.testCollection)
      };
      
      logger.success("MongoDB setup completed");
    } catch (error) {
      throw new TestError(
        "Failed to setup MongoDB connection",
        "MONGO_SETUP_FAILED",
        { uri: config.getSafeMongoUri(), error: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Cleanup after tests
   */
  private async teardown(): Promise<void> {
    logger.info("Cleaning up MongoDB resources...");
    
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.context = null;
        logger.success("MongoDB connection closed");
      }
    } catch (error) {
      logger.warning("Error during MongoDB cleanup", error as Record<string, unknown>);
    }
  }

  /**
   * Runs an individual test with error handling and time measurement
   */
  private async runSingleTest(testFn: () => Promise<TestResult>): Promise<TestResult> {
    try {
      const { result, duration } = await TestUtils.measureTime(testFn);
      return { ...result, duration };
    } catch (error) {
      return {
        name: "Unknown Test",
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * MongoDB connection test
   */
  private async testConnection(): Promise<TestResult> {
    const testName = "MongoDB Connection";
    logger.testProgress(testName, 'running');

    try {
      if (!this.client || !this.context) {
        throw new TestError("MongoDB client not initialized", "CLIENT_NOT_INITIALIZED");
      }

      // Verify that the connection is active
      await this.client.db("admin").command({ ping: 1 });
      
      logger.testProgress(testName, 'passed');
      logger.info(`Connected to: ${config.getSafeMongoUri()}`);
      
      return {
        name: testName,
        status: "passed",
        duration: 0
      };
    } catch (error) {
      logger.testProgress(testName, 'failed');
      return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test de validación de nombres
   */
  private async testNameValidation(): Promise<TestResult> {
    const testName = "Name Validation";
    logger.testProgress(testName, 'running');

    try {
      const { mongodb } = config.config;
      
      // Test con nombres válidos
      validateDbAndCollectionNames(mongodb.testDb, mongodb.testCollection);
      
      // Test con nombres inválidos (debería fallar)
      const invalidNames = ["", "invalid name with spaces", "a".repeat(100)];
      
      for (const invalidName of invalidNames) {
        try {
          validateDbAndCollectionNames(invalidName, mongodb.testCollection);
          throw new Error(`Validation should have failed for: ${invalidName}`);
        } catch (error) {
          // Se esperaba que fallara
          if (error instanceof Error && error.message.includes("should have failed")) {
            throw error;
          }
        }
      }
      
      logger.testProgress(testName, 'passed');
      return {
        name: testName,
        status: "passed",
        duration: 0
      };
    } catch (error) {
      logger.testProgress(testName, 'failed');
      return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test de existencia de base de datos y colección
   */
  private async testDatabaseExistence(): Promise<TestResult> {
    const testName = "Database & Collection Existence";
    logger.testProgress(testName, 'running');

    try {
      const { mongodb } = config.config;
      
      const dbExists = await databaseExists(mongodb.testDb);
      const collExists = await collectionExists(mongodb.testDb, mongodb.testCollection);
      
      logger.info(`Database '${mongodb.testDb}' exists: ${dbExists}`);
      logger.info(`Collection '${mongodb.testCollection}' exists: ${collExists}`);
      
      logger.testProgress(testName, 'passed');
      return {
        name: testName,
        status: "passed",
        duration: 0,
        context: { dbExists, collExists }
      };
    } catch (error) {
      logger.testProgress(testName, 'failed');
      return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test de creación de colección
   */
  private async testCollectionCreation(): Promise<TestResult> {
    const testName = "Collection Creation";
    logger.testProgress(testName, 'running');

    try {
      const { mongodb } = config.config;
      
      await createDatabaseAndCollection(mongodb.testDb, mongodb.testCollection);
      
      // Verificar que la colección fue creada
      const collections = await this.context!.db.listCollections({ name: mongodb.testCollection }).toArray();
      const collectionExists = collections.length > 0;
      
      if (!collectionExists) {
        throw new TestError("Collection was not created", "COLLECTION_NOT_CREATED");
      }
      
      logger.testProgress(testName, 'passed');
      logger.success(`Colección '${mongodb.testCollection}' creada/verificada exitosamente`);
      
      return {
        name: testName,
        status: "passed",
        duration: 0
      };
    } catch (error) {
      logger.testProgress(testName, 'failed');
      return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Test de operaciones básicas de MongoDB
   */
  private async testBasicOperations(): Promise<TestResult> {
    const testName = "Basic MongoDB Operations";
    logger.testProgress(testName, 'running');

    try {
      if (!this.context) {
        throw new TestError("MongoDB context not available", "CONTEXT_NOT_AVAILABLE");
      }

      const testDoc = TestUtils.generateTestDocument({
        name: "MongoDB Test Document",
        description: "Test document for basic operations"
      });

      // Test INSERT
      if (!this.context?.collection) {
        throw new TestError("Collection not available", "COLLECTION_NOT_AVAILABLE");
      }
      
      const insertResult = await this.context.collection.insertOne(testDoc);
      if (!insertResult.insertedId) {
        throw new TestError("Insert operation failed", "INSERT_FAILED");
      }
      logger.info(`Documento insertado con ID: ${insertResult.insertedId}`);

      // Test FIND
      const findResult = await this.context.collection.findOne({ testId: testDoc.testId });
      if (!findResult) {
        throw new TestError("Find operation failed", "FIND_FAILED");
      }
      logger.info("Documento encontrado exitosamente");

      // Test UPDATE
      const updateResult = await this.context.collection.updateOne(
        { _id: insertResult.insertedId },
        { $set: { updated: true, updateTime: new Date() } }
      );
      if (updateResult.modifiedCount !== 1) {
        throw new TestError("Update operation failed", "UPDATE_FAILED");
      }
      logger.info("Document successfully updated");

      // Test DELETE
      const deleteResult = await this.context.collection.deleteOne({ _id: insertResult.insertedId });
      if (deleteResult.deletedCount !== 1) {
        throw new TestError("Delete operation failed", "DELETE_FAILED");
      }
      logger.info("Document successfully deleted");

      logger.testProgress(testName, 'passed');
      return {
        name: testName,
        status: "passed",
        duration: 0,
        context: {
          insertedId: insertResult.insertedId,
          operations: ['insert', 'find', 'update', 'delete']
        }
      };
    } catch (error) {
      logger.testProgress(testName, 'failed');
      return {
        name: testName,
        status: "failed",
        duration: 0,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }
}