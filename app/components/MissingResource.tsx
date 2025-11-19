"use client";
import React from "react";
import type { ButtonClasses } from "../types";
import { CircleStackIcon, PlusCircleIcon } from "@heroicons/react/24/outline";

interface MissingResourceProps {
  error?: string;
  selectedDb: string;
  selectedCollection: string;
  cardClasses: string;
  buttonClasses: ButtonClasses;
  onCreateClick: () => void;
  canCreateDbCollection?: boolean;
  disableReasonCreateDb?: string;
}

const MissingResource: React.FC<MissingResourceProps> = ({
  error,
  selectedDb,
  selectedCollection,
  cardClasses,
  buttonClasses,
  onCreateClick,
  canCreateDbCollection = true,
  disableReasonCreateDb,
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
          <CircleStackIcon className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--text)] mb-2">{title}</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          {description}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { if (!canCreateDbCollection) return; onCreateClick(); }}
            disabled={!canCreateDbCollection}
            title={!canCreateDbCollection ? (disableReasonCreateDb || "Only admins can create databases/collections") : undefined}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${buttonClasses.secondary}`}
          >
            <span className="flex items-center gap-2">
              <PlusCircleIcon className="w-5 h-5 text-[var(--text)]" />
              <span>{ctaText}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MissingResource;