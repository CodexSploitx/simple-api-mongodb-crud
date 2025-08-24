"use client";
import React, { useState, useCallback } from "react";

interface Document {
  _id: string;
  [key: string]: unknown;
}

const Dashboard = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [selectedDb, setSelectedDb] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateDbModal, setShowCreateDbModal] = useState(false);
  const [createModalMessage, setCreateModalMessage] = useState("");
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [newDocJson, setNewDocJson] = useState("{}");
  const [searchQuery, setSearchQuery] = useState("{}");
  const [error, setError] = useState("");
  // Nuevos estados para controlar la conexión
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDb, setConnectedDb] = useState("");
  const [connectedCollection, setConnectedCollection] = useState("");

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  // Función apiCall reutilizable para otras operaciones
  const apiCall = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      return response.json();
    },
    [API_TOKEN]
  );

  // loadDocuments con lógica integrada para evitar dependencias circulares
  // loadDocuments con manejo de errores mejorado y retry automático
  // loadDocuments sin retry automático para evitar bucles infinitos
  // loadDocuments simplificado sin llamadas automáticas
  const loadDocuments = useCallback(async () => {
    if (!selectedDb || !selectedCollection) {
      setError("Por favor selecciona una base de datos y colección");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Usar GET /api/:db/:collection en lugar de POST /api/find
      const response = await fetch(
        `/api/${encodeURIComponent(selectedDb)}/${encodeURIComponent(
          selectedCollection
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_TOKEN}`,
          },
        }
      );

      if (response.status === 404) {
        const errorData = await response.json();
        setCreateModalMessage(
          errorData.message || "La base de datos o colección no existe"
        );
        setShowCreateDbModal(true);
        // Resetear estado de conexión si no existe
        setIsConnected(false);
        setConnectedDb("");
        setConnectedCollection("");
        return;
      }

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setDocuments(data.data || []); // El endpoint GET devuelve los documentos en data.data

      // Actualizar estado de conexión exitosa
      setIsConnected(true);
      setConnectedDb(selectedDb);
      setConnectedCollection(selectedCollection);
    } catch (err) {
      setError("Error cargando documentos");
      console.error("Error:", err);
      // Resetear estado de conexión en caso de error
      setIsConnected(false);
      setConnectedDb("");
      setConnectedCollection("");
    } finally {
      setLoading(false);
    }
  }, [
    selectedDb,
    selectedCollection,
    API_TOKEN,
    setError,
    setLoading,
    setCreateModalMessage,
    setShowCreateDbModal,
    setIsConnected,
    setConnectedDb,
    setConnectedCollection,
    setDocuments,
  ]);

  // Resetear conexión cuando cambia DB o colección
  const handleDbChange = (value: string) => {
    setSelectedDb(value);
    if (value !== connectedDb) {
      setIsConnected(false);
      setConnectedDb("");
      setConnectedCollection("");
    }
  };

  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value);
    if (value !== connectedCollection) {
      setIsConnected(false);
      setConnectedDb("");
      setConnectedCollection("");
    }
  };

  // Agregar esta función después de loadDocuments (alrededor de la línea 90)
  // Mejorar la función handleConnect
  const handleConnect = useCallback(async () => {
    if (!selectedDb || !selectedCollection) {
      setError("Por favor selecciona una base de datos y colección");
      return;
    }

    // Resetear estados antes de conectar
    setError("");
    setIsConnected(false);
    setConnectedDb("");
    setConnectedCollection("");

    // Llamar a loadDocuments que manejará la conexión y carga automática
    await loadDocuments();
  }, [
    selectedDb,
    selectedCollection,
    loadDocuments,
    setError,
    setIsConnected,
    setConnectedDb,
    setConnectedCollection,
  ]);

  const searchDocuments = async () => {
    if (!selectedDb || !selectedCollection) return;
    setLoading(true);
    setError("");
    try {
      const query = JSON.parse(searchQuery);
      const data = await apiCall("/api/find", {
        method: "POST",
        body: JSON.stringify({
          db: selectedDb,
          collection: selectedCollection,
          query: query,
        }),
      });
      if (data.success) {
        setDocuments(data.data || []);
      } else {
        setError(data.message || "Error en búsqueda");
      }
    } catch (err) {
      setError("Error en búsqueda");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createDocument = async () => {
    if (!selectedDb || !selectedCollection) return;
    setError("");
    try {
      const doc = JSON.parse(newDocJson);
      await apiCall("/api/insertOne", {
        method: "POST",
        body: JSON.stringify({
          db: selectedDb,
          collection: selectedCollection,
          document: doc,
        }),
      });
      setShowCreateModal(false);
      setNewDocJson("{}");
      loadDocuments();
    } catch (err) {
      setError("Error creando documento");
      console.error(err);
    }
  };

  const updateDocument = async () => {
    if (!selectedDb || !selectedCollection || !editingDoc) return;
    setError("");
    try {
      const doc = JSON.parse(newDocJson);
      await apiCall("/api/updateOne", {
        method: "PUT",
        body: JSON.stringify({
          db: selectedDb,
          collection: selectedCollection,
          filter: { _id: editingDoc._id },
          update: { $set: doc },
        }),
      });
      setShowEditModal(false);
      setEditingDoc(null);
      setNewDocJson("{}");
      loadDocuments();
    } catch (err) {
      setError("Error actualizando documento");
      console.error(err);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!selectedDb || !selectedCollection) return;
    if (!confirm("¿Estás seguro de eliminar este documento?")) return;
    setError("");
    try {
      await apiCall("/api/deleteOne", {
        method: "DELETE",
        body: JSON.stringify({
          db: selectedDb,
          collection: selectedCollection,
          filter: { _id: docId },
        }),
      });
      loadDocuments();
    } catch (err) {
      setError("Error eliminando documento");
      console.error(err);
    }
  };

  // Corrección 2: Eliminar la variable _id no utilizada
  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
    // Opción 2: Usar el prefijo de comentario para ESLint
    const { _id: _, ...docWithoutId } = doc; // eslint-disable-line @typescript-eslint/no-unused-vars
    setNewDocJson(JSON.stringify(docWithoutId, null, 2));
    setShowEditModal(true);
  };

  const createDbAndCollection = useCallback(async () => {
    if (!selectedDb || !selectedCollection) return;

    setLoading(true);
    try {
      const initialDoc = {
        createdAt: new Date().toISOString(),
        message: "Documento inicial - puedes editarlo o eliminarlo",
        type: "initial",
      };

      const response = await fetch("/api/insertOne", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify({
          db: selectedDb,
          collection: selectedCollection,
          document: initialDoc,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error creando colección: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setShowCreateDbModal(false);
        setCreateModalMessage("");
        // Conectar automáticamente después de crear
        await loadDocuments();
      } else {
        setError(result.message || "Error creando la colección");
      }
    } catch (err) {
      setError("Error creando la base de datos/colección");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDb, selectedCollection, API_TOKEN, loadDocuments]);

  // ELIMINAR o comentar este useEffect (líneas 207-211)
  // useEffect(() => {
  //   if (selectedDb && selectedCollection) {
  //     loadDocuments();
  //   }
  // }, [selectedDb, selectedCollection, loadDocuments]);

  const themeClasses = darkMode
    ? "bg-gray-900 text-white min-h-screen"
    : "bg-gray-50 text-gray-900 min-h-screen";

  const cardClasses = darkMode
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";

  const inputClasses = darkMode
    ? "bg-gray-700 border-gray-600 text-white"
    : "bg-white border-gray-300 text-gray-900";

  return (
    <div className={themeClasses}>
      <header
        className={`flex justify-between items-center p-4 border-b ${
          darkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <h1 className="text-2xl font-bold">MongoDB Admin Dashboard</h1>

        <div className="flex items-center space-x-4">
          {/* Indicador de estado de conexión */}
          {isConnected && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 dark:bg-green-900 border border-green-300 dark:border-green-700 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-800 dark:text-green-200">
                Conectado: {connectedDb}.{connectedCollection}
              </span>
            </div>
          )}

          <button
            className={`px-4 py-2 rounded transition-colors ${
              darkMode
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
            }`}
            onClick={() => setDarkMode(!darkMode)}
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div
          className={`w-64 p-4 border-r ${
            darkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Base de Datos:
            </label>
            <input
              type="text"
              className={`w-full p-2 border rounded ${inputClasses}`}
              placeholder="Nombre de la DB"
              value={selectedDb}
              onChange={(e) => handleDbChange(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Colección:</label>
            <input
              type="text"
              className={`w-full p-2 border rounded ${inputClasses}`}
              placeholder="Nombre de la colección"
              value={selectedCollection}
              onChange={(e) => handleCollectionChange(e.target.value)}
            />
          </div>

          {selectedDb && selectedCollection && (
            <div className="space-y-2 flex flex-col">
              <button
                onClick={handleConnect}
                disabled={loading}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? "Conectando..." : "Conectar"}
              </button>

              {/* Botones solo disponibles cuando hay conexión exitosa */}
              <button
                onClick={loadDocuments}
                disabled={loading || !isConnected}
                className={`w-full px-3 py-2 rounded transition-colors ${
                  !isConnected
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                }`}
              >
                🔄 Cargar Documentos
              </button>

              <button
                onClick={() => setShowSearchModal(true)}
                disabled={!isConnected}
                className={`w-full px-3 py-2 rounded transition-colors ${
                  !isConnected
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
              >
                🔍 Buscar
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                disabled={!isConnected}
                className={`w-full px-3 py-2 rounded transition-colors ${
                  !isConnected
                    ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                    : "bg-purple-600 text-white hover:bg-purple-700"
                }`}
              >
                ➕ Crear Documento
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2">Cargando...</p>
            </div>
          )}

          {!selectedDb || !selectedCollection ? (
            <div className="text-center py-12">
              <h2 className="text-xl mb-4">
                Bienvenido al Dashboard de MongoDB
              </h2>
              <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                Selecciona una base de datos y colección para comenzar
              </p>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {selectedDb}.{selectedCollection} ({documents.length}{" "}
                  documentos)
                </h2>
              </div>

              <div className="grid gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className={`p-4 border rounded-lg ${cardClasses}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        ID: {doc._id}
                      </code>
                      <div className="space-x-2">
                        <button
                          onClick={() => openEditModal(doc)}
                          className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => deleteDocument(doc._id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                    <pre
                      className={`text-sm overflow-x-auto p-3 rounded ${
                        darkMode ? "bg-gray-700" : "bg-gray-100"
                      }`}
                    >
                      {JSON.stringify(doc, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`${cardClasses} p-6 rounded-lg w-full max-w-2xl`}>
            <h3 className="text-lg font-semibold mb-4">
              Crear Nuevo Documento
            </h3>
            <textarea
              className={`w-full h-64 p-3 border rounded font-mono text-sm ${inputClasses}`}
              value={newDocJson}
              onChange={(e) => setNewDocJson(e.target.value)}
              placeholder='{"campo": "valor"}'
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className={`px-4 py-2 rounded transition-colors ${
                  darkMode
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={createDocument}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`${cardClasses} p-6 rounded-lg w-full max-w-2xl`}>
            <h3 className="text-lg font-semibold mb-4">Editar Documento</h3>
            <textarea
              className={`w-full h-64 p-3 border rounded font-mono text-sm ${inputClasses}`}
              value={newDocJson}
              onChange={(e) => setNewDocJson(e.target.value)}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowEditModal(false)}
                className={`px-4 py-2 rounded transition-colors ${
                  darkMode
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={updateDocument}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className={`${cardClasses} p-6 rounded-lg w-full max-w-2xl`}>
            <h3 className="text-lg font-semibold mb-4">Buscar Documentos</h3>
            <textarea
              className={`w-full h-32 p-3 border rounded font-mono text-sm ${inputClasses}`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='{"campo": "valor"}'
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowSearchModal(false)}
                className={`px-4 py-2 rounded transition-colors ${
                  darkMode
                    ? "bg-gray-600 hover:bg-gray-700"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={searchDocuments}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal para crear DB/Colección */}
      {showCreateDbModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Base de datos/colección no encontrada
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {createModalMessage}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              ¿Deseas crear la base de datos &ldquo;{selectedDb}&rdquo; y la
              colección &ldquo;{selectedCollection}&rdquo;?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateDbModal(false);
                  setCreateModalMessage("");
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createDbAndCollection}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
