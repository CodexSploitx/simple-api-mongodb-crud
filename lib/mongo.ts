import { MongoClient, Db, Collection } from "mongodb";

let client: MongoClient;

const uri: string = process.env.MONGODB_URI || "mongodb://localhost:27017";

export async function connectToDatabase(dbName: string): Promise<Db> {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("✅ Connected to MongoDB");
  }
  
  // Always requires a specific database name
  return client.db(dbName);
}

export async function getCollection(
  dbName: string,
  collectionName: string
): Promise<Collection> {
  const database: Db = await connectToDatabase(dbName);
  return database.collection(collectionName);
}

export async function createDatabaseAndCollection(
  dbName: string,
  collectionName: string
): Promise<Collection> {
  const database: Db = await connectToDatabase(dbName);
  return database.collection(collectionName);
}

// Function to validate DB and collection names
export function validateDbAndCollectionNames(db: string, collection: string): void {
  if (!db || db.trim().length === 0) {
    throw new Error("Database name is required");
  }
  if (!collection || collection.trim().length === 0) {
    throw new Error("Collection name is required");
  }
  
  // Validate maximum length (MongoDB limits)
  if (db.length > 64) {
    throw new Error("Database name too long (max 64 characters)");
  }
  if (collection.length > 64) {
    throw new Error("Collection name too long (max 64 characters)");
  }
  
  // Additional validations for valid MongoDB names
  const invalidChars = /[\\/$\"\s]/;
  if (invalidChars.test(db)) {
    throw new Error("Database name contains invalid characters");
  }
  if (invalidChars.test(collection)) {
    throw new Error("Collection name contains invalid characters");
  }
}

// Function to check if a database exists
export async function databaseExists(dbName: string): Promise<boolean> {
  try {
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
    }
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    return databases.databases.some(db => db.name === dbName);
  } catch (error: unknown) {
    // Suppress authentication errors that are expected
    if (error && typeof error === 'object' && 'code' in error && error.code === 13) {
      return false; // Assume it doesn't exist if we don't have permissions to check
    }
    console.error('Error checking database:', error);
    return false;
  }
}

// Function to check if a collection exists
export async function collectionExists(dbName: string, collectionName: string): Promise<boolean> {
  try {
    const database = await connectToDatabase(dbName);
    const collections = await database.listCollections({ name: collectionName }).toArray();
    return collections.length > 0;
  } catch (error: unknown) {
    // Suppress authentication errors that are expected
    if (error && typeof error === 'object' && 'code' in error && error.code === 13) {
      return false; // Assume it doesn't exist if we don't have permissions to check
    }
    console.error('Error checking collection:', error);
    return false;
  }
}

// Function to check if a collection has documents
export async function collectionHasDocuments(dbName: string, collectionName: string): Promise<boolean> {
  try {
    const collection = await getCollection(dbName, collectionName);
    const count = await collection.countDocuments();
    return count > 0;
  } catch (error) {
    console.error('Error counting documents:', error);
    return false;
  }
}

// Function to validate existence before queries
export async function validateForQuery(dbName: string, collectionName: string): Promise<{
  valid: boolean;
  error?: string;
  message?: string;
}> {
  // For queries, the DB and collection must exist
  const dbExists = await databaseExists(dbName);
  if (!dbExists) {
    return {
      valid: false,
      error: "Database not found",
      message: `Database '${dbName}' does not exist. Create some documents first using POST /api/insertOne.`
    };
  }
  
  const collExists = await collectionExists(dbName, collectionName);
  if (!collExists) {
    return {
      valid: false,
      error: "Collection not found",
      message: `Collection '${collectionName}' does not exist in '${dbName}'. Create some documents first using POST /api/insertOne.`
    };
  }
  
  return { valid: true };
}

// Function to validate before inserting (more permissive)
export async function validateForInsert(dbName: string, collectionName: string): Promise<{
  valid: boolean;
  error?: string;
  message?: string;
}> {
  // For inserting, we only validate valid names
  // MongoDB will create the DB and collection automatically
  try {
    validateDbAndCollectionNames(dbName, collectionName);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: "Invalid names",
      message: error instanceof Error ? error.message : "Validation error"
    };
  }
}
