"use client";
import React, { useState, useCallback, useEffect } from "react";
import { getThemeStyles, getUIClasses } from "../../styles/colors";
import Header from "./Header";
import Sidebar from "./Sidebar";
import DocumentGrid from "./DocumentGrid";
import Pagination from "./Pagination";
import SearchModal from "./SearchModal";
import CreateModal from "./CreateModal";
import EditModal from "./EditModal";
import CreateDbModal from "./CreateDbModal";
import MissingResource from "./MissingResource";
import DbExplorer from "./DbExplorer";
import DocumentViewModal from "./DocumentViewModal";

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
  // Deprecated: newDocument replaced by newDocJson
  // const [newDocument, setNewDocument] = useState("");
  const [newDbName, setNewDbName] = useState("");
  const [newCollectionName, setNewCollectionName] = useState("");
  const [documentsPerPage] = useState(10);
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  // Estado de usuario actual y permisos
  const [currentUser, setCurrentUser] = useState<{ _id: string; username?: string; role?: "admin" | "user"; permissions?: Record<string, boolean> } | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN;

  // Cargar usuario actual desde /api/auth/me
  useEffect(() => {
    const loadUser = async () => {
      setUserLoading(true);
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          setCurrentUser(json?.data || null);
        } else {
          setCurrentUser(null);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setCurrentUser(null);
      } finally {
        setUserLoading(false);
      }
    };
    loadUser();
  }, []);

  // Función apiCall reutilizable para otras operaciones
  const apiCall = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        ...options.headers,
      };
      const response = await fetch(endpoint, {
        headers,
        credentials: "include",
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
      setFieldNames([]);
    }
  };

  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value);
    if (value !== connectedCollection) {
      setIsConnected(false);
      setConnectedDb("");
      setConnectedCollection("");
      setCurrentPage(1);
      setFieldNames([]);
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
    setFieldNames([]);

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
    // Usar siempre la conexión activa para paginar
    if (!connectedDb || !connectedCollection) return;
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      loadDocuments(connectedDb, connectedCollection, newPage);
    }
  };

  // Función para cargar documentos con paginación mejorada
  const loadDocuments = useCallback(async (db: string, collection: string, page: number = 1) => {
    if (!db || !collection) return;

    setLoading(true);
    try {
      const limit = 10; // Documentos por página
      
      const response = await fetch(
        `/api/${db}/${collection}?page=${page}&limit=${limit}`,
        {
          headers: {
            ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
          },
          credentials: "include",
        }
      );

      if (response.ok) {
        const json = await response.json();
        const payload = json?.data || {};
        const docs = payload.documents || [];
        const total = payload.pagination?.total ?? (Array.isArray(docs) ? docs.length : 0);
        const pageNum = payload.pagination?.page ?? page;
        const totalPagesCalc = payload.pagination?.totalPages ?? Math.ceil(total / limit);

        setDocuments(docs);
        // Calcular nombres de campos de los documentos cargados (solo nombres, sin datos)
        const names = Array.isArray(docs)
          ? Array.from(new Set(docs.flatMap((d: Record<string, unknown>) => Object.keys(d))))
          : [];
        setFieldNames(names);

        setTotalDocuments(total);
        setTotalPages(totalPagesCalc);
        setCurrentPage(pageNum);
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
        setFieldNames([]);
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
      setFieldNames([]);
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
        const docs = data?.data?.documents || [];
        const total = data?.data?.count ?? (Array.isArray(docs) ? docs.length : 0);
        setDocuments(docs);
        const names = Array.isArray(docs)
          ? Array.from(new Set(docs.flatMap((d: Record<string, unknown>) => Object.keys(d))))
          : [];
        setFieldNames(names);
        setTotalDocuments(total);
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

  const goBackToDatabases = () => {
    setSelectedDb("");
    setSelectedCollection("");
    setIsConnected(false);
    setConnectedDb("");
    setConnectedCollection("");
    setDocuments([]);
    setFieldNames([]);
    setError("");
    setCurrentPage(1);
    setTotalPages(1);
    setTotalDocuments(0);
  };

  // Flags de permisos
  const canCreate = Boolean(currentUser?.permissions?.register);
  const canUpdate = Boolean(currentUser?.permissions?.update);
  const canDelete = Boolean(currentUser?.permissions?.delete);
  const canFind = Boolean(currentUser?.permissions?.find);
  const isAdmin = currentUser?.role === "admin";

  const createDocument = async () => {
    if (!canCreate) {
      setError("You don't have permission to create documents");
      return;
    }
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
    if (!canUpdate) {
      setError("You don't have permission to update documents");
      return;
    }
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
    if (!canDelete) {
      setError("You don't have permission to delete documents");
      return;
    }
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
    if (!isAdmin) {
      setError("Only admins can create databases/collections");
      return;
    }
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
          ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
        },
        credentials: "include",
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

  const themeStyles = getThemeStyles(darkMode);
  const { themeClasses, cardClasses, inputClasses, buttonClasses } = getUIClasses();

  return (
    <div className={themeClasses} style={themeStyles}>
      <Header
        darkMode={darkMode}
        isConnected={isConnected}
        connectedDb={connectedDb}
        connectedCollection={connectedCollection}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenCreateModal={() => {
          if (!canCreate) {
            setError("You don't have permission to create documents");
            return;
          }
          setShowCreateModal(true);
        }}
        onOpenCreateDbModal={() => {
          if (!isAdmin) {
            setError("Only admins can create databases/collections");
            return;
          }
          const msg = error === "Database not found"
            ? `La base de datos '${selectedDb}' no existe. Créala junto con '${selectedCollection}'.`
            : error === "Collection not found"
            ? `La colección '${selectedCollection}' no existe en '${selectedDb}'. Créala ahora.`
            : "Crea una nueva base de datos y/o colección.";
          setCreateModalMessage(msg);
          setNewDbName(selectedDb);
          setNewCollectionName(selectedCollection);
          setShowCreateDbModal(true);
        }}
        cardClasses={cardClasses}
        buttonClasses={buttonClasses}
        canCreateDocument={canCreate}
        canCreateDbCollection={isAdmin}
        disableReasonCreateDoc={canCreate ? undefined : "You don't have permission to create documents"}
        disableReasonCreateDb={isAdmin ? undefined : "Only admins can create databases/collections"}
        currentUserName={currentUser?.username}
        currentUserRole={currentUser?.role}
      />

      <div className="flex gap-6">
        <Sidebar
          selectedDb={selectedDb}
          selectedCollection={selectedCollection}
          isConnected={isConnected}
          loading={loading}
          error={error}
          cardClasses={cardClasses}
          inputClasses={inputClasses}
          buttonClasses={buttonClasses}
          documentsPerPage={documentsPerPage}
          totalDocuments={totalDocuments}
          currentPage={currentPage}
          totalPages={totalPages}
          onDbChange={handleDbChange}
          onCollectionChange={handleCollectionChange}
          onLoadDocuments={() => loadDocuments(connectedDb, connectedCollection, 1)}
          onConnect={handleConnect}
          onOpenCreateDbModal={() => {
            if (!isAdmin) {
              setError("Only admins can create databases/collections");
              return;
            }
            const msg = error === "Database not found"
              ? `The database '${selectedDb}' does not exist. Create it now along with '${selectedCollection}'.`
              : error === "Collection not found"
              ? `The collection '${selectedCollection}' does not exist in '${selectedDb}'. Create it now.`
              : "Create a new database and/or collection.";
            setCreateModalMessage(msg);
            // Prefill with current selections
            setNewDbName(selectedDb);
            setNewCollectionName(selectedCollection);
            setShowCreateDbModal(true);
          }}
        />

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
                  <span className="material-symbols-outlined text-red-500 text-base">error</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

          {loading && (
            <div className="text-center py-12">
              <span className="material-symbols-outlined animate-spin inline-block text-[var(--text)] text-2xl">progress_activity</span>
              <p className="mt-4 text-sm text-[var(--text-muted)]">Loading documents...</p>
            </div>
          )}

          {!selectedDb || !selectedCollection ? (
            <DbExplorer
              onSelectDb={(db) => {
                handleDbChange(db);
              }}
              onViewCollection={(db, col) => {
                handleDbChange(db);
                handleCollectionChange(col);
                // Conectar y cargar documentos como si se seleccionara manualmente
                loadDocuments(db, col, 1);
              }}
            />
          ) : (
            <div>
              <div className="mb-4">
                <button
                  className={`px-2 py-1 rounded-md text-xs ${buttonClasses.secondary}`}
                  onClick={goBackToDatabases}
                >
                  <span className="material-symbols-outlined text-[var(--text)] text-base align-middle">arrow_back</span>
                  <span className="ml-1 align-middle">Volver a bases</span>
                </button>
              </div>
              {/* Header with pagination */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text)] mb-1">
                  {selectedDb}.{selectedCollection}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {totalDocuments} total documents • Page {currentPage} of {totalPages}
                </p>
                {isConnected && fieldNames.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-[var(--text)] mb-1">Fields in documents:</p>
                    <div className="flex flex-wrap gap-2">
                      {fieldNames.map((name) => (
                        <span
                          key={name}
                          className={`px-2 py-1 text-xs rounded border ${darkMode ? "bg-gray-800 border-gray-700 text-gray-300" : "bg-gray-100 border-gray-300 text-gray-700"}`}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  buttonClasses={buttonClasses}
                  onPageChange={handlePageChange}
                  variant="compact"
                />
              </div>

              {/* Missing resource component or documents grid */}
              {(!isConnected && (error === "Database not found" || error === "Collection not found")) ? (
                <MissingResource
                  error={error}
                  selectedDb={selectedDb}
                  selectedCollection={selectedCollection}
                  cardClasses={cardClasses}
                  buttonClasses={buttonClasses}
                  onCreateClick={() => {
                    if (!isAdmin) {
                      setError("Only admins can create databases/collections");
                      return;
                    }
                    const msg = error === "Database not found"
                      ? `La base de datos '${selectedDb}' no existe. Créala junto con '${selectedCollection}'.`
                      : error === "Collection not found"
                      ? `La colección '${selectedCollection}' no existe en '${selectedDb}'. Créala ahora.`
                      : "Crea una nueva base de datos y/o colección.";
                    setCreateModalMessage(msg);
                    setNewDbName(selectedDb);
                    setNewCollectionName(selectedCollection);
                    setShowCreateDbModal(true);
                  }}
                  canCreateDbCollection={isAdmin}
                  disableReasonCreateDb={isAdmin ? undefined : "Only admins can create databases/collections"}
                />
              ) : (
                <DocumentGrid
                  documents={documents}
                  darkMode={darkMode}
                  cardClasses={cardClasses}
                  buttonClasses={buttonClasses}
                  onEdit={openEditModal}
                  onDelete={(id: string) => deleteDocument(id)}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  disableReasonUpdate={canUpdate ? undefined : "You don't have permission to update documents"}
                  disableReasonDelete={canDelete ? undefined : "You don't have permission to delete documents"}
                  onViewFull={(doc) => { setViewDoc(doc as Document); setShowViewModal(true); }}
                />
              )}

              {/* Bottom Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    buttonClasses={buttonClasses}
                    onPageChange={handlePageChange}
                    variant="full"
                    darkMode={darkMode}
                  />
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal
          darkMode={darkMode}
          cardClasses={cardClasses}
          inputClasses={inputClasses}
          buttonClasses={buttonClasses}
          searchQuery={searchQuery}
          onChangeQuery={setSearchQuery}
          loading={loading}
          onSearch={searchDocuments}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateModal
          cardClasses={cardClasses}
          inputClasses={inputClasses}
          buttonClasses={buttonClasses}
          newDocJson={newDocJson}
          onChangeNewDoc={setNewDocJson}
          onCreate={createDocument}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Duplicate Create Modal removed in favor of component above */}

      {/* Edit Modal */}
      {showEditModal && (
        <EditModal
          darkMode={darkMode}
          cardClasses={cardClasses}
          inputClasses={inputClasses}
          buttonClasses={buttonClasses}
          editingDoc={editingDoc}
          newDocJson={newDocJson}
          onChangeNewDoc={setNewDocJson}
          onUpdate={updateDocument}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {showViewModal && (
        <DocumentViewModal
          darkMode={darkMode}
          cardClasses={cardClasses}
          buttonClasses={buttonClasses}
          doc={viewDoc}
          onClose={() => { setShowViewModal(false); setViewDoc(null); }}
        />
      )}

      {/* Create DB/Collection Modal */}
      {showCreateDbModal && (
        <CreateDbModal
          cardClasses={cardClasses}
          inputClasses={inputClasses}
          buttonClasses={buttonClasses}
          message={createModalMessage}
          newDbName={newDbName}
          newCollectionName={newCollectionName}
          loading={loading}
          onChangeDbName={setNewDbName}
          onChangeCollectionName={setNewCollectionName}
          onCreate={createDbAndCollection}
          onClose={() => setShowCreateDbModal(false)}
          canCreateDbCollection={isAdmin}
          disableReasonCreateDb={isAdmin ? undefined : "Only admins can create databases/collections"}
        />
      )}
      </div>
    </div>
  );
};

export default Dashboard;
