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
  // Estados para controlar la conexión
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDb, setConnectedDb] = useState("");
  const [connectedCollection, setConnectedCollection] = useState("");
  // Nuevos estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocuments, setTotalDocuments] = useState(0);
  // Estados adicionales que faltaban
  const [newDocument, setNewDocument] = useState("");
  const [newDbName, setNewDbName] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [documentsPerPage] = useState(10);

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



  // Resetear conexión cuando cambia DB o colección
  const handleDbChange = (value: string) => {
    setSelectedDb(value);
    if (value !== connectedDb) {
      setIsConnected(false);
      setConnectedDb("");
      setConnectedCollection("");
      setCurrentPage(1);
    }
  };

  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value);
    if (value !== connectedCollection) {
      setIsConnected(false);
      setConnectedDb("");
      setConnectedCollection("");
      setCurrentPage(1);
    }
  };

  // Función handleConnect mejorada
  const handleConnect = async () => {
    if (!selectedDb || !selectedCollection) {
      setError("Please select both database and collection");
      return;
    }

    setLoading(true);
    setError("");
    setDocuments([]);
    setCurrentPage(1);
    setTotalDocuments(0);
    setTotalPages(0);

    try {
      // Usar la nueva función loadDocuments con paginación
      await loadDocuments(selectedDb, selectedCollection, 1);
    } catch (error) {
      console.error("Connection error:", error);
      setError("Error connecting to database");
    }
  };

  // Función para cambiar de página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      loadDocuments(selectedDb, selectedCollection, newPage);
    }
  };

  // Función para cargar documentos con paginación mejorada
  const loadDocuments = useCallback(async (db: string, collection: string, page: number = 1) => {
    if (!db || !collection) return;

    setLoading(true);
    try {
      const limit = 10; // Documentos por página
      const skip = (page - 1) * limit;
      
      const response = await fetch(
        `/api/${db}/${collection}?limit=${limit}&skip=${skip}`,
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        setTotalDocuments(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / limit));
        setCurrentPage(page);
        setIsConnected(true);
        setConnectedDb(db);
        setConnectedCollection(collection);
        setError("");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Error loading documents");
        setDocuments([]);
        setTotalDocuments(0);
        setTotalPages(0);
        setCurrentPage(1);
        setIsConnected(false);
        setConnectedDb("");
        setConnectedCollection("");
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      setError("Error connecting to server");
      setDocuments([]);
      setTotalDocuments(0);
      setTotalPages(0);
      setCurrentPage(1);
      setIsConnected(false);
      setConnectedDb("");
      setConnectedCollection("");
    } finally {
      setLoading(false);
    }
  }, [API_TOKEN]);

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
        setTotalDocuments(data.data?.length || 0);
        setTotalPages(1);
        setCurrentPage(1);
      } else {
        setError(data.message || "Search error");
      }
    } catch (err) {
      setError("Search error");
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
      loadDocuments(selectedDb, selectedCollection, currentPage);
    } catch (err) {
      setError("Error creating document");
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
      loadDocuments(selectedDb, selectedCollection, currentPage);
    } catch (err) {
      setError("Error updating document");
      console.error(err);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!selectedDb || !selectedCollection) return;
    if (!confirm("Are you sure you want to delete this document?")) return;
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
      loadDocuments(selectedDb, selectedCollection, currentPage);
    } catch (err) {
      setError("Error deleting document");
      console.error(err);
    }
  };

  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
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
        message: "Initial document - you can edit or delete it",
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
        throw new Error(`Error creating collection: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setShowCreateDbModal(false);
        setCreateModalMessage("");
        // Conectar automáticamente después de crear
        await loadDocuments(selectedDb, selectedCollection, 1);
      } else {
        setError(result.message || "Error creating collection");
      }
    } catch (err) {
      setError("Error creating database/collection");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDb, selectedCollection, API_TOKEN, loadDocuments]);

  const themeClasses = darkMode
    ? "bg-gray-900 text-gray-100 min-h-screen"
    : "bg-gray-50 text-gray-900 min-h-screen";

  const cardClasses = darkMode
    ? "bg-gray-800 border border-gray-700 shadow-sm"
    : "bg-white border border-gray-200 shadow-sm";

  const inputClasses = darkMode
    ? "bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 focus:border-gray-500 focus:ring-1 focus:ring-gray-500"
    : "bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-400 focus:ring-1 focus:ring-gray-400";

  const buttonClasses = {
    primary: darkMode
      ? "bg-gray-700 hover:bg-gray-600 text-gray-100 border border-gray-600 transition-colors duration-200"
      : "bg-gray-900 hover:bg-gray-800 text-white border border-gray-900 transition-colors duration-200",
    secondary: darkMode
      ? "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 transition-colors duration-200"
      : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 transition-colors duration-200",
    danger: darkMode
      ? "bg-red-900 hover:bg-red-800 text-red-100 border border-red-800 transition-colors duration-200"
      : "bg-red-600 hover:bg-red-700 text-white border border-red-600 transition-colors duration-200",
    success: darkMode
      ? "bg-green-800 hover:bg-green-700 text-green-100 border border-green-700 transition-colors duration-200"
      : "bg-green-600 hover:bg-green-700 text-white border border-green-600 transition-colors duration-200",
    purple: darkMode
      ? "bg-purple-800 hover:bg-purple-700 text-purple-100 border border-purple-700 transition-colors duration-200"
      : "bg-purple-600 hover:bg-purple-700 text-white border border-purple-600 transition-colors duration-200",
  };

  return (
    <div className={themeClasses}>
      {/* Header profesional */}
      <header className={`${cardClasses} rounded-none border-b p-4 mb-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H4V7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">MongoDB Admin</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Database Management Console</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isConnected && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  {connectedDb}.{connectedCollection}
                </span>
              </div>
            )}
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${buttonClasses.secondary} text-sm`}
            >
              {darkMode ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex gap-6">
        {/* Sidebar profesional */}
        <aside className={`w-80 ${cardClasses} rounded-lg p-6 h-fit`}>
          <div className="space-y-6">
            {/* Connection Section */}
            <div>
              <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connection
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Database
                  </label>
                  <input
                    type="text"
                    value={selectedDb}
                    onChange={(e) => handleDbChange(e.target.value)}
                    placeholder="Enter database name"
                    className={`w-full px-3 py-2 rounded-lg text-sm ${inputClasses}`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Collection
                  </label>
                  <input
                    type="text"
                    value={selectedCollection}
                    onChange={(e) => handleCollectionChange(e.target.value)}
                    placeholder="Enter collection name"
                    className={`w-full px-3 py-2 rounded-lg text-sm ${inputClasses}`}
                  />
                </div>
              </div>
              
              <div className="space-y-3 mt-6">
                <button
                  onClick={() => loadDocuments(connectedDb, connectedCollection, 1)}
                  disabled={loading || !isConnected}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    !isConnected ? buttonClasses.secondary : buttonClasses.primary
                  }`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>{loading ? "Loading..." : "Load Documents"}</span>
                  </span>
                </button>
                
                <button
                  onClick={handleConnect}
                  disabled={loading || !selectedDb || !selectedCollection}
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.primary}`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.102m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>{loading ? "Connecting..." : "Connect"}</span>
                  </span>
                </button>
              </div>
            </div>

            {/* Actions Section */}
            {selectedDb && selectedCollection && (
              <div className="border-t pt-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  Actions
                </h2>
                
                <div className="space-y-3">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${buttonClasses.primary}`}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Add Document</span>
                    </span>
                  </button>
                  
                  <button
                    onClick={() => setShowCreateDbModal(true)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
                  >
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>Create DB/Collection</span>
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Statistics */}
            {isConnected && (
              <div className={`p-6 rounded-2xl border ${cardClasses}`}>
                <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Statistics</span>
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Documents:</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{totalDocuments}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Page:</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">{currentPage} of {totalPages}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Per Page:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{documentsPerPage}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <main className="p-6">
            {error && (
              <div className={`mb-6 p-4 border rounded-lg ${
                darkMode 
                  ? "bg-red-900/20 border-red-800 text-red-300" 
                  : "bg-red-50 border-red-200 text-red-700"
              }`}>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading documents...</p>
            </div>
          )}

          {!selectedDb || !selectedCollection ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7M4 7c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Welcome to MongoDB Admin
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Select a database and collection to get started
              </p>
            </div>
          ) : (
            <div>
              {/* Header with pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                    {selectedDb}.{selectedCollection}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {totalDocuments} total documents • Page {currentPage} of {totalPages}
                  </p>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {currentPage} / {totalPages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* Documents Grid */}
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className={`p-4 border rounded-lg transition-colors duration-200 hover:border-gray-300 dark:hover:border-gray-600 ${cardClasses}`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start mb-3 space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <code className="text-xs font-mono px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded">
                          ID: {doc._id}
                        </code>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditModal(doc)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
                        >
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </span>
                        </button>
                        <button
                          onClick={() => deleteDocument(doc._id)}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors duration-200 ${buttonClasses.danger}`}
                        >
                          <span className="flex items-center space-x-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Delete</span>
                          </span>
                        </button>
                      </div>
                    </div>
                    
                    <pre className={`text-xs overflow-x-auto p-3 rounded border ${
                      darkMode 
                        ? "bg-gray-900 border-gray-700 text-gray-300" 
                        : "bg-gray-50 border-gray-200 text-gray-700"
                    }`}>
                      {JSON.stringify(doc, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
                    >
                      First
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
                    >
                      Previous
                    </button>
                    
                    <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      {currentPage} of {totalPages}
                    </span>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl p-6 rounded-lg border ${cardClasses}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search Documents</span>
              </h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">MongoDB Query (JSON):</label>
                <textarea
                  className={`w-full p-3 border rounded-lg h-32 font-mono text-sm transition-colors duration-200 ${inputClasses}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='{"field": "value"}'
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={searchDocuments}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 ${buttonClasses.primary}`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Search</span>
                  </span>
                </button>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl p-6 rounded-lg border ${cardClasses}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create Document</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Document JSON:</label>
                <textarea
                  className={`w-full p-3 border rounded-lg h-40 font-mono text-sm transition-colors duration-200 ${inputClasses}`}
                  value={newDocument}
                  onChange={(e) => setNewDocument(e.target.value)}
                  placeholder='{"name": "example", "value": 123}'
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={createDocument}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 ${buttonClasses.primary}`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create</span>
                  </span>
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl p-6 rounded-lg border ${cardClasses}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create New Document</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Document JSON:</label>
                <textarea
                  className={`w-full p-3 border rounded-xl h-40 font-mono text-sm transition-all duration-200 ${inputClasses}`}
                  value={newDocJson}
                  onChange={(e) => setNewDocJson(e.target.value)}
                  placeholder='{"key": "value"}'
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={createDocument}
                  className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${buttonClasses.purple}`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Document</span>
                  </span>
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all duration-200 ${buttonClasses.secondary}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-2xl p-6 rounded-lg border ${cardClasses}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Edit Document</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Document ID: <code className="text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{editingDoc._id}</code>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Document JSON:</label>
                <textarea
                  className={`w-full p-3 border rounded-lg h-40 font-mono text-sm transition-colors duration-200 ${inputClasses}`}
                  value={newDocument}
                  onChange={(e) => setNewDocument(e.target.value)}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={updateDocument}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${buttonClasses.primary}`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Update Document</span>
                  </span>
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create DB/Collection Modal */}
      {showCreateDbModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-md p-6 rounded-lg border ${cardClasses}`}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Create Database/Collection</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {createModalMessage}
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Database Name:</label>
                <input
                  type="text"
                  className={`w-full p-3 border rounded-lg transition-colors duration-200 ${inputClasses}`}
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  placeholder="Enter database name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Collection Name:</label>
                <input
                  type="text"
                  className={`w-full p-3 border rounded-lg transition-colors duration-200 ${inputClasses}`}
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Enter collection name"
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={createDbAndCollection}
                  disabled={loading}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 ${buttonClasses.primary}`}
                >
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9" />
                    </svg>
                    <span>Create</span>
                  </span>
                </button>
                <button
                  onClick={() => setShowCreateDbModal(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${buttonClasses.secondary}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;
