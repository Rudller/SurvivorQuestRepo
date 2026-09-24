"use client";

import { useState } from "react";

import {
  useDeleteCaseFileMutation,
  useGetCaseFilesQuery,
  useMoveCaseFileMutation,
  type CaseFileEntry,
  type CaseFileKind,
} from "@/features/realizations/api/realization.api";
import { CaseFileForm } from "./case-file-form";

/**
 * Zakładka „Akta" — lista dowodów realizacji.
 *
 * Wzorzec z points-qr-codes-manager: osobne wywołania API per element, lokalny
 * stan tylko dla formularza. Realizacja w edycji zawsze ma id, więc nie ma tu
 * problemu „zapisz najpierw, potem dodawaj".
 */

type CaseFilesManagerProps = {
  realizationId: string;
  stations: { id: string; name: string }[];
};

const KIND_LABELS: Record<CaseFileKind, string> = {
  text: "Notatka",
  image: "Zdjęcie",
  audio: "Nagranie",
  dossier: "Kartoteka",
};

export function CaseFilesManager({ realizationId, stations }: CaseFilesManagerProps) {
  const { data, isLoading, isError } = useGetCaseFilesQuery({ realizationId });
  const [moveCaseFile] = useMoveCaseFileMutation();
  const [deleteCaseFile] = useDeleteCaseFileMutation();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const entries = data?.entries ?? [];

  async function handleDelete(entry: CaseFileEntry) {
    setDeletingId(entry.id);
    try {
      await deleteCaseFile({ realizationId, caseFileId: entry.id }).unwrap();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm text-zinc-300">
          Dowody, które drużyny zbierają w trakcie gry. Dowód bez przypisanego
          stanowiska jest widoczny od startu; pozostałe odblokowują się, gdy{" "}
          <strong className="text-zinc-100">dowolna</strong> drużyna zaliczy
          wskazane stanowisko — akta są wspólne dla całej realizacji.
        </p>
        <p className="text-xs text-zinc-500">
          {`Wyłączenie ustawienia „Pokaż akta" ukrywa je w aplikacji, ale ich nie kasuje.`}
        </p>
      </div>

      {stations.length === 0 ? (
        <p className="rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-xs text-amber-200">
          {`Realizacja nie ma jeszcze zapisanych stanowisk. Dowody możesz dodawać, ale przypiszesz je do stanowisk dopiero po zapisaniu zakładki „Stanowiska".`}
        </p>
      ) : null}

      {isAdding ? (
        <CaseFileForm
          realizationId={realizationId}
          stations={stations}
          onDone={() => setIsAdding(false)}
          onCancel={() => setIsAdding(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:border-amber-400/60"
        >
          Dodaj dowód
        </button>
      )}

      {isLoading ? <p className="text-sm text-zinc-500">Wczytywanie…</p> : null}
      {isError ? (
        <p className="text-sm text-red-400">Nie udało się wczytać dowodów.</p>
      ) : null}
      {!isLoading && !isError && entries.length === 0 ? (
        <p className="text-sm text-zinc-500">
          {`Brak dowodów. Dodaj pierwszy — pojawi się w aktach jako „Dowód 01".`}
        </p>
      ) : null}

      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300">
                    {KIND_LABELS[entry.kind]}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Dowód {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="truncate text-sm font-medium text-zinc-100">
                  {entry.title}
                </p>
                <p className="text-xs text-zinc-500">
                  {entry.unlockMode === "from-start"
                    ? "Widoczny od startu gry"
                    : `Po stanowisku: ${entry.stationName ?? "— stanowisko usunięte —"}`}
                </p>
                {entry.unlockMode === "after-station" && !entry.stationId ? (
                  <p className="text-xs text-red-400">
                    Dowód stracił przypisanie do stanowiska (scenariusz został
                    podmieniony). W aplikacji zostaje zablokowany — wskaż
                    stanowisko ponownie.
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    void moveCaseFile({ realizationId, caseFileId: entry.id, direction: "up" })
                  }
                  disabled={index === 0}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                  aria-label="Przesuń w górę"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void moveCaseFile({ realizationId, caseFileId: entry.id, direction: "down" })
                  }
                  disabled={index === entries.length - 1}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                  aria-label="Przesuń w dół"
                >
                  ↓
                </button>
              </div>
            </div>

            {entry.kind === "image" && entry.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.url}
                alt={entry.title}
                className="max-h-32 rounded border border-zinc-800 object-contain"
              />
            ) : null}
            {entry.kind === "audio" && entry.url ? (
              <audio controls src={entry.url} className="w-full" />
            ) : null}
            {entry.kind === "text" && entry.body ? (
              <p className="line-clamp-3 text-xs text-zinc-400">{entry.body}</p>
            ) : null}
            {entry.kind === "dossier" && entry.fields ? (
              <p className="text-xs text-zinc-500">
                {entry.fields.length} pól: {entry.fields.map((f) => f.label).join(", ")}
              </p>
            ) : null}

            {editingId === entry.id ? (
              <CaseFileForm
                realizationId={realizationId}
                stations={stations}
                initial={entry}
                onDone={() => setEditingId(null)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingId(entry.id)}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100"
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(entry)}
                  disabled={deletingId === entry.id}
                  className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:border-red-500/70 disabled:opacity-50"
                >
                  {deletingId === entry.id ? "Usuwanie…" : "Usuń"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
