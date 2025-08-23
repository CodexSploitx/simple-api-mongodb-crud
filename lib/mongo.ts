import { MongoClient, Db, Collection } from "mongodb";

let client: MongoClient;

const uri: string = process.env.MONGODB_URI || "mongodb://localhost:27017";

export async function connectToDatabase(dbName: string): Promise<Db> {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("✅ Conectado a MongoDB");
  }
  
  // Siempre requiere un nombre de base de datos específico
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

// Función para validar nombres de DB y colección
export function validateDbAndCollectionNames(db: string, collection: string): void {
  if (!db || db.trim().length === 0) {
    throw new Error("El nombre de la base de datos es requerido");
  }
  if (!collection || collection.trim().length === 0) {
    throw new Error("El nombre de la colección es requerido");
  }
  
  // Validaciones adicionales para nombres válidos de MongoDB
  const invalidChars = /[\\/$\"\s]/;
  if (invalidChars.test(db)) {
    throw new Error("El nombre de la base de datos contiene caracteres inválidos");
  }
  if (invalidChars.test(collection)) {
    throw new Error("El nombre de la colección contiene caracteres inválidos");
  }
}

// Función para verificar si una base de datos existe
export async function databaseExists(dbName: string): Promise<boolean> {
  try {
    if (!client) {
      client = new MongoClient(uri);
      await client.connect();
    }
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    return databases.databases.some(db => db.name === dbName);
  } catch (error) {
    console.error('Error verificando base de datos:', error);
    return false;
  }
}

// Función para verificar si una colección existe
export async function collectionExists(dbName: string, collectionName: string): Promise<boolean> {
  try {
    const database = await connectToDatabase(dbName);
    const collections = await database.listCollections({ name: collectionName }).toArray();
    return collections.length > 0;
  } catch (error) {
    console.error('Error verificando colección:', error);
    return false;
  }
}

// Función para verificar si una colección tiene documentos
export async function collectionHasDocuments(dbName: string, collectionName: string): Promise<boolean> {
  try {
    const collection = await getCollection(dbName, collectionName);
    const count = await collection.countDocuments();
    return count > 0;
  } catch (error) {
    console.error('Error contando documentos:', error);
    return false;
  }
}

// Función para validar existencia antes de consultas
export async function validateForQuery(dbName: string, collectionName: string): Promise<{
  valid: boolean;
  error?: string;
  message?: string;
}> {
  // Para consultas, la DB y colección deben existir
  const dbExists = await databaseExists(dbName);
  if (!dbExists) {
    return {
      valid: false,
      error: "Base de datos no encontrada",
      message: `La base de datos '${dbName}' no existe. Crea algunos documentos primero usando POST /api/insertOne.`
    };
  }
  
  const collExists = await collectionExists(dbName, collectionName);
  if (!collExists) {
    return {
      valid: false,
      error: "Colección no encontrada",
      message: `La colección '${collectionName}' no existe en '${dbName}'. Crea algunos documentos primero usando POST /api/insertOne.`
    };
  }
  
  return { valid: true };
}

// Función para validar antes de insertar (más permisiva)
export async function validateForInsert(dbName: string, collectionName: string): Promise<{
  valid: boolean;
  error?: string;
  message?: string;
}> {
  // Para insertar, solo validamos nombres válidos
  // MongoDB creará la DB y colección automáticamente
  try {
    validateDbAndCollectionNames(dbName, collectionName);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: "Nombres inválidos",
      message: error instanceof Error ? error.message : "Error de validación"
    };
  }
}
