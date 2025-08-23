import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import {
  validateDbAndCollectionNames,
  databaseExists,
  collectionExists,
  createDatabaseAndCollection,
} from "./lib/mongo.ts";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Test configuration
const TEST_DB = "test_database";
const TEST_COLLECTION = "test_collection";
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const API_TOKEN = process.env.API_TOKEN || "";
const BASE_URL = "http://localhost:3000";

// Console colors
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

// Logging functions
function logSuccess(message: string) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message: string) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message: string) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function logWarning(message: string) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logHeader(message: string) {
  console.log(`\n${colors.bold}${colors.blue}🔷 ${message}${colors.reset}`);
  console.log(`${colors.blue}${"-".repeat(50)}${colors.reset}`);
}

// Main test
async function runMongoTests() {
  let testsPassed = 0;
  let testsFailed = 0;
  let client: MongoClient | null = null;

  logHeader("STARTING MONGODB AND API ENDPOINTS TESTS");

  try {
    // 1. MongoDB connection test
    logHeader("MONGODB CONNECTION TEST");

    try {
      // Create client and connect
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      logSuccess("MongoDB connection established successfully");
      logInfo(
        `Connection URI: ${MONGODB_URI.replace(/\/\/.*@/, "//***:***@")}`
      );
      testsPassed++;
    } catch (error) {
      logError(`MongoDB connection error: ${error}`);
      testsFailed++;
      return false;
    }

    // 2. Name validation test
    logHeader("NAME VALIDATION TEST");

    try {
      validateDbAndCollectionNames(TEST_DB, TEST_COLLECTION);
      logSuccess("DB and collection name validation: OK");
      testsPassed++;
    } catch (error) {
      logError(`Name validation error: ${error}`);
      testsFailed++;
    }

    // 3. Database and collection existence test
    logHeader("DB AND COLLECTION EXISTENCE TEST");

    try {
      const dbExists = await databaseExists(TEST_DB);
      const collExists = await collectionExists(TEST_DB, TEST_COLLECTION);

      logInfo(`Database '${TEST_DB}' exists: ${dbExists}`);
      logInfo(`Collection '${TEST_COLLECTION}' exists: ${collExists}`);
      logSuccess("Existence verification completed");
      testsPassed++;
    } catch (error) {
      logError(`Error checking existence: ${error}`);
      testsFailed++;
    }

    // 4. Collection creation test
    logHeader("COLLECTION CREATION TEST");

    try {
      await createDatabaseAndCollection(TEST_DB, TEST_COLLECTION);
      logSuccess(
        `Collection '${TEST_COLLECTION}' created/obtained successfully`
      );
      testsPassed++;
    } catch (error) {
      logError(`Error creating collection: ${error}`);
      testsFailed++;
    }

    // 5. API endpoints test
    const apiResults = await testApiEndpoints();
    testsPassed += apiResults.passed;
    testsFailed += apiResults.failed;
  } catch (error) {
    logError(`General test error: ${error}`);
    testsFailed++;
  } finally {
    if (client) {
      await client.close();
      logInfo("MongoDB connection closed");
    }
  }

  // Final summary
  logHeader("TEST SUMMARY");
  logInfo(`Tests executed: ${testsPassed + testsFailed}`);
  logSuccess(`Successful tests: ${testsPassed}`);

  if (testsFailed > 0) {
    logError(`Failed tests: ${testsFailed}`);
  }

  const success = testsFailed === 0;
  if (success) {
    logSuccess("🎉 ALL TESTS PASSED SUCCESSFULLY!");
  } else {
    logError("💥 SOME TESTS FAILED");
  }

  return success;
}

// API endpoints test
async function testApiEndpoints(): Promise<{ passed: number; failed: number }> {
  logHeader("API ENDPOINTS TEST");

  let passed = 0;
  let failed = 0;

  if (!API_TOKEN) {
    logWarning(
      "API_TOKEN not found in .env.local - using test token"
    );
  }

  const testDocument = {
    name: "Test Document",
    value: 42,
    timestamp: new Date().toISOString(),
    testId: Math.random().toString(36).substring(7),
    description: "Test document for testing",
  };

  let insertedDocumentId: string | null = null;

  // Test 1: POST /api/insertOne
  try {
    logInfo("Testing POST /api/insertOne...");

    const insertResponse = await fetch(`${BASE_URL}/api/insertOne`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({
        db: TEST_DB,
        collection: TEST_COLLECTION,
        document: testDocument,
      }),
    });

    if (insertResponse.ok) {
      const insertResult = await insertResponse.json();
      insertedDocumentId = insertResult.data?.insertedId;
      logSuccess(
        `POST /api/insertOne: Document inserted with ID ${insertedDocumentId}`
      );
      passed++;
    } else {
      const errorText = await insertResponse.text();
      logError(
        `POST /api/insertOne failed: ${insertResponse.status} - ${errorText}`
      );
      failed++;
    }
  } catch (error) {
    logError(`Error in POST /api/insertOne: ${error}`);
    failed++;
  }

  // Test 2: POST /api/find
  try {
    logInfo("Testing POST /api/find...");

    const findResponse = await fetch(`${BASE_URL}/api/find`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({
        db: TEST_DB,
        collection: TEST_COLLECTION,
        query: { testId: testDocument.testId },
      }),
    });

    if (findResponse.ok) {
      const findResult = await findResponse.json();
      logSuccess(
        `POST /api/find: Found ${
          findResult.data?.documents?.length || 0
        } documents`
      );
      passed++;
    } else {
      const errorText = await findResponse.text();
      logError(`POST /api/find failed: ${findResponse.status} - ${errorText}`);
      failed++;
    }
  } catch (error) {
    logError(`Error in POST /api/find: ${error}`);
    failed++;
  }

  // Test 3: POST /api/findOne
  if (insertedDocumentId) {
    try {
      logInfo("Testing POST /api/findOne...");

      const findOneResponse = await fetch(`${BASE_URL}/api/findOne`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          db: TEST_DB,
          collection: TEST_COLLECTION,
          query: { _id: insertedDocumentId },
        }),
      });

      if (findOneResponse.ok) {
        const findOneResult = await findOneResponse.json();
        logSuccess(
          `POST /api/findOne: Document found - ${
            findOneResult.data?.name || "No name"
          }`
        );
        passed++;
      } else {
        const errorText = await findOneResponse.text();
        logError(
          `POST /api/findOne failed: ${findOneResponse.status} - ${errorText}`
        );
        failed++;
      }
    } catch (error) {
      logError(`Error in POST /api/findOne: ${error}`);
      failed++;
    }
  }

  // Test 4: PUT /api/updateOne
  if (insertedDocumentId) {
    try {
      logInfo("Testing PUT /api/updateOne...");

      const updateResponse = await fetch(`${BASE_URL}/api/updateOne`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          db: TEST_DB,
          collection: TEST_COLLECTION,
          filter: { _id: insertedDocumentId },
          update: {
            $set: {
              updated: true,
              updateTime: new Date().toISOString(),
              version: 2,
            },
          },
        }),
      });

      if (updateResponse.ok) {
        const updateResult = await updateResponse.json();
        logSuccess(
          `PUT /api/updateOne: Documents modified: ${updateResult.data?.modifiedCount}`
        );
        passed++;
      } else {
        const errorText = await updateResponse.text();
        logError(
          `PUT /api/updateOne failed: ${updateResponse.status} - ${errorText}`
        );
        failed++;
      }
    } catch (error) {
      logError(`Error in PUT /api/updateOne: ${error}`);
      failed++;
    }
  }

  // Test 5: GET /api/[db]/[collection]
  try {
    logInfo(`Testing GET /api/${TEST_DB}/${TEST_COLLECTION}...`);

    const getAllResponse = await fetch(
      `${BASE_URL}/api/${TEST_DB}/${TEST_COLLECTION}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
      }
    );

    if (getAllResponse.ok) {
      const getAllResult = await getAllResponse.json();
      logSuccess(
        `GET /api/${TEST_DB}/${TEST_COLLECTION}: ${
          getAllResult.count || 0
        } documents obtained`
      );
      passed++;
    } else {
      const errorText = await getAllResponse.text();
      logError(
        `GET /api/${TEST_DB}/${TEST_COLLECTION} failed: ${getAllResponse.status} - ${errorText}`
      );
      failed++;
    }
  } catch (error) {
    logError(`Error in GET /api/${TEST_DB}/${TEST_COLLECTION}: ${error}`);
    failed++;
  }

  // Test 6: DELETE /api/deleteOne (cleanup)
  if (insertedDocumentId) {
    try {
      logInfo("Testing DELETE /api/deleteOne...");

      const deleteResponse = await fetch(`${BASE_URL}/api/deleteOne`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          db: TEST_DB,
          collection: TEST_COLLECTION,
          filter: { _id: insertedDocumentId },
        }),
      });

      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();
        logSuccess(
          `DELETE /api/deleteOne: Documents deleted: ${deleteResult.data?.deletedCount}`
        );
        passed++;
      } else {
        const errorText = await deleteResponse.text();
        logError(
          `DELETE /api/deleteOne failed: ${deleteResponse.status} - ${errorText}`
        );
        failed++;
      }
    } catch (error) {
      logError(`Error in DELETE /api/deleteOne: ${error}`);
      failed++;
    }
  }

  return { passed, failed };
}

// Cleanup function
async function cleanupTestData() {
  logHeader("TEST DATA CLEANUP");

  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(TEST_DB);

    // Delete test collection
    try {
      await db.collection(TEST_COLLECTION).drop();
      logSuccess(`Collection '${TEST_COLLECTION}' deleted`);
    } catch {
      logInfo(`Collection '${TEST_COLLECTION}' didn't exist or was already deleted`);
    }

    // Check if database is empty and delete it
    const collections = await db.listCollections().toArray();
    if (collections.length === 0) {
      await db.dropDatabase();
      logSuccess(`Database '${TEST_DB}' deleted`);
    }

    await client.close();
  } catch (error) {
    logWarning(`Error during cleanup: ${error}`);
  }
}

// Environment variables validation
function validateEnvironment() {
  logHeader("ENVIRONMENT VARIABLES VALIDATION");

  const requiredVars = ["MONGODB_URI", "API_TOKEN"];
  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
      logError(`Missing environment variable: ${varName}`);
    } else {
      logSuccess(`Environment variable found: ${varName}`);
    }
  }

  if (missingVars.length > 0) {
    logError(`Missing ${missingVars.length} required environment variables`);
    return false;
  }

  return true;
}

// Run tests if file is executed directly
if (
  import.meta.url.includes("mongo-test.ts") ||
  process.argv[1]?.includes("mongo-test.ts")
) {
  (async () => {
    try {
      // Validate environment
      if (!validateEnvironment()) {
        process.exit(1);
      }

      // Run tests
      const success = await runMongoTests();

      if (success) {
        logInfo(
          "Do you want to clean up test data? Running automatic cleanup..."
        );
        await cleanupTestData();
      }

      process.exit(success ? 0 : 1);
    } catch (error) {
      logError(`Fatal error: ${error}`);
      process.exit(1);
    }
  })();
}

export { runMongoTests, cleanupTestData, TEST_DB, TEST_COLLECTION };
