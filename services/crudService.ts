import { Document, Collection, InsertOneResult, FindCursor, ObjectId } from "mongodb";
import {
  getCollection,
  createDatabaseAndCollection,
  validateDbAndCollectionNames,
  connectToDatabase,
  validateForQuery
} from "../lib/mongo";
import type { UpdateOneRequest, UpdateOneResponse, DeleteOneRequest, DeleteOneResponse } from "../types/mongo";

export async function insertOne(
  collection: Collection,
  data: Document
): Promise<InsertOneResult> {
  return await collection.insertOne(data);
}

export async function insertOneWithDynamicDB(
  dbName: string,
  collectionName: string,
  document: Document
): Promise<InsertOneResult> {
  validateDbAndCollectionNames(dbName, collectionName);
  const collection: Collection = await createDatabaseAndCollection(
    dbName,
    collectionName
  );
  return await collection.insertOne(document);
}

export async function findAllDocuments(
  dbName: string,
  collectionName: string
): Promise<Document[]> {
  validateDbAndCollectionNames(dbName, collectionName);
  const collection: Collection = await getCollection(dbName, collectionName);
  const cursor: FindCursor<Document> = collection.find({});
  return await cursor.toArray();
}

export async function findOneDocument(
  dbName: string,
  collectionName: string,
  filter: Document
): Promise<Document | null> {
  validateDbAndCollectionNames(dbName, collectionName);
  const collection: Collection = await getCollection(dbName, collectionName);
  return await collection.findOne(filter);
}

export async function findDocuments(
  dbName: string,
  collectionName: string,
  query: Document = {},
  options: {
    limit?: number;
    skip?: number;
    sort?: Document;
    projection?: Document;
  } = {}
): Promise<{ documents: Document[]; count: number }> {
  // Validar nombres
  validateDbAndCollectionNames(dbName, collectionName);

  // Obtener la colección
  const collection = await getCollection(dbName, collectionName);

  // Construir opciones de consulta
  const findOptions: {
    limit?: number;
    skip?: number;
    sort?: Document;
    projection?: Document;
  } = {};
  if (options.limit) findOptions.limit = options.limit;
  if (options.skip) findOptions.skip = options.skip;
  if (options.sort) findOptions.sort = options.sort;
  if (options.projection) findOptions.projection = options.projection;

  // Ejecutar consulta
  const documents = await collection.find(query, findOptions).toArray();
  const count = documents.length; // ❌ PROBLEMA: Esto devuelve el count de los documentos encontrados, no el total

  return { documents, count };
}

export async function updateOneDocument(
  request: UpdateOneRequest
): Promise<UpdateOneResponse> {
  const { db, collection, filter, update, options = {} } = request;

  // Validar nombres de base de datos y colección
  validateDbAndCollectionNames(db, collection);

  // Validar que la base de datos y colección existan
  const validation = await validateForQuery(db, collection);
  if (!validation.valid) {
    throw new Error(validation.error || 'Database or collection validation failed');
  }

  // Verificar operadores atómicos
  const atomicOperators = ['$set', '$unset', '$inc', '$mul', '$rename', '$min', '$max', '$currentDate', '$addToSet', '$pop', '$pull', '$push', '$pullAll', '$each', '$slice', '$sort', '$position'];
  const updateKeys = Object.keys(update);
  
  if (updateKeys.length === 0) {
    throw new Error('Update document cannot be empty');
  }
  
  const hasAtomicOperator = updateKeys.some(key => atomicOperators.includes(key));
  if (!hasAtomicOperator) {
    throw new Error('Update document requires atomic operators like $set, $inc, $push, etc. Example: { "$set": { "field": "value" } }');
  }

  // Convertir _id string a ObjectId si es necesario
  const processedFilter = { ...filter };
  if (processedFilter._id && typeof processedFilter._id === 'string') {
    try {
      processedFilter._id = new ObjectId(processedFilter._id);
    } catch (error) {
      throw new Error(`Invalid ObjectId format in filter, error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  try {
    // Conectar a la base de datos
    const database = await connectToDatabase(db);
    const col = database.collection(collection);

    // Usar updateOne para obtener información precisa sobre la modificación
    const updateResult = await col.updateOne(processedFilter, update, options);
    
    // Si se necesita el documento actualizado, hacer una consulta adicional
    let updatedDocument = null;
    if (updateResult.modifiedCount > 0) {
      updatedDocument = await col.findOne(processedFilter);
    }
    
    return {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged,
      upsertedId: updateResult.upsertedId || null,
      document: updatedDocument
    };
  } catch (error) {
    console.error('Error updating document:', error);
    throw new Error(`Error updating document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteOneDocument(
  request: DeleteOneRequest
): Promise<DeleteOneResponse> {
  const { db, collection, filter, options = {} } = request;

  // Validar nombres de base de datos y colección
  validateDbAndCollectionNames(db, collection);

  // Validar que la base de datos y colección existan
  const validation = await validateForQuery(db, collection);
  if (!validation.valid) {
    throw new Error(validation.error || 'Database or collection validation failed');
  }

  // Validar que el filtro no esté vacío
  if (!filter || Object.keys(filter).length === 0) {
    throw new Error('Filter cannot be empty. Provide at least one field to identify the document to delete.');
  }

  // Convertir _id string a ObjectId si es necesario
  const processedFilter = { ...filter };
  if (processedFilter._id && typeof processedFilter._id === 'string') {
    try {
      processedFilter._id = new ObjectId(processedFilter._id);
    } catch (error) {
      throw new Error(`Invalid ObjectId format in filter, error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  try {
    // Conectar a la base de datos
    const database = await connectToDatabase(db);
    const col = database.collection(collection);

    // Usar deleteOne para obtener información precisa sobre la eliminación
    const deleteResult = await col.deleteOne(processedFilter, options);
    
    // Si se necesita el documento eliminado, hacer una consulta antes de eliminar
    let deletedDocument = null;
    if (deleteResult.deletedCount > 0) {
      // Como ya se eliminó, no podemos obtener el documento
      // Pero podemos confirmar que se eliminó correctamente
      deletedDocument = { _id: processedFilter._id }; // Solo retornamos el ID como confirmación
    }

    return {
      deletedCount: deleteResult.deletedCount,
      acknowledged: deleteResult.acknowledged,
      document: deletedDocument
    };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw new Error(`Error deleting document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
