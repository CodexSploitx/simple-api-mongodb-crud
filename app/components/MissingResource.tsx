"use client";
import React from "react";
import type { ButtonClasses } from "../types";

interface MissingResourceProps {
  error?: string;
  selectedDb: string;
  selectedCollection: string;
  cardClasses: string;
  buttonClasses: ButtonClasses;
  onCreateClick: () => void;
}

const MissingResource: React.FC<MissingResourceProps> = ({
  error,
  selectedDb,
  selectedCollection,
  cardClasses,
  buttonClasses,
  onCreateClick,
}) => {
  const isDbMissing = error === "Database not found";
  const isCollectionMissing = error === "Collection not found";

  const title = isDbMissing
    ? `La base de datos '${selectedDb}' no existe`
    : isCollectionMissing
    ? `La colección '${selectedCollection}' no existe`
    : "Recurso no encontrado";

  const description = isDbMissing
    ? `Puedes crear la base de datos '${selectedDb}' y opcionalmente la colección '${selectedCollection}'.`
    : isCollectionMissing
    ? `Puedes crear la colección '${selectedCollection}' dentro de '${selectedDb}'.`
    : "Verifica los nombres o crea un nuevo recurso.";

  const ctaText = isDbMissing
    ? "Crear DB/Colección"
    : isCollectionMissing
    ? "Crear Colección"
    : "Crear DB/Colección";

  return (
    <div className={`mx-auto max-w-xl p-6 rounded-2xl border ${cardClasses}`}>
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[var(--surface)] flex items-center justify-center">
          <span className="material-symbols-outlined text-red-500 text-3xl">database_off</span>
        </div>
        <h2 className="text-xl font-semibold text-[var(--text)] mb-2">{title}</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {description}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onCreateClick}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${buttonClasses.secondary}`}
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[var(--text)] text-base">add_circle</span>
              <span>{ctaText}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingResource;