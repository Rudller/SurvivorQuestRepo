"use client";

import { useState } from "react";

import type { CaseFileKind } from "@/features/realizations/api/realization.api";
import { CaseFileForm } from "./case-file-form";
import { releaseDraftPreview, type DraftCaseFile } from "./case-file-draft";

/**
 * Akta w formularzu NOWEGO scenariusza — ta sama lista co CaseFilesManager,
 * tylko trzymana w stanie formularza. Dowody zapisują się razem ze scenariuszem
 * (saveDraftCaseFiles), bo zanim scenariusz powstanie, nie ma pod czym ich
 * zapisać.
 */

type CaseFilesDraftManagerProps = {
  drafts: DraftCaseFile[];
  onChange: (next: DraftCaseFile[]) => void;
  /** Stanowiska zaznaczone w tym samym formularzu (jeszcze niezapisane). */
  stations: { id: string; name: string }[];
};

const KIND_LABELS: Record<CaseFileKind, string> = {
  text: "Notatka",
  image: "Zdjęcie",
  audio: "Nagranie",
  dossier: "Kartoteka",
};

export function CaseFilesDraftManager({ drafts, onChange, stations }: CaseFilesDraftManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const stationNameById = new Map(stations.map((station) => [station.id, station.name]));

  function move(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= drafts.length) {
      return;
    }
    const next = [...drafts];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(draft: DraftCaseFile) {
    releaseDraftPreview(draft);
    onChange(drafts.filter((item) => item.localId !== draft.localId));
  }

  function replace(updated: DraftCaseFile) {
    const previous = drafts.find((item) => item.localId === updated.localId);
    if (previous && previous.payload.url !== updated.payload.url) {
      releaseDraftPreview(previous);
    }
    onChange(drafts.map((item) => (item.localId === updated.localId ? updated : item)));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-300">
        Dowody, które drużyny zbierają w trakcie gry. Zapiszą się razem ze scenariuszem, a przy tworzeniu
        realizacji skopiują się do niej. Dowód „po stanowisku” wybiera stanowisko z zaznaczonych wyżej.
      </p>

      {isAdding ? (
        <CaseFileForm
          stations={stations}
          draft={{ onSave: (draft) => onChange([...drafts, draft]) }}
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

      {drafts.length === 0 ? (
        <p className="text-sm text-zinc-500">{`Brak dowodów. Dodaj pierwszy — pojawi się w aktach jako „Dowód 01".`}</p>
      ) : null}

      <div className="space-y-3">
        {drafts.map((draft, index) => {
          const { payload } = draft;
          const stationName = payload.stationId ? stationNameById.get(payload.stationId) : null;

          return (
            <div key={draft.localId} className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300">
                      {KIND_LABELS[payload.kind]}
                    </span>
                    <span className="text-xs text-zinc-500">Dowód {String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="truncate text-sm font-medium text-zinc-100">{payload.title}</p>
                  <p className="text-xs text-zinc-500">
                    {payload.unlockMode === "from-start"
                      ? "Widoczny od startu gry"
                      : `Po stanowisku: ${stationName ?? "— odznaczone wyżej —"}`}
                  </p>
                  {payload.unlockMode === "after-station" && !stationName ? (
                    <p className="text-xs text-red-400">
                      To stanowisko nie jest już zaznaczone w scenariuszu — zaznacz je ponownie albo wybierz inne.
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                    aria-label="Przesuń w górę"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === drafts.length - 1}
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                    aria-label="Przesuń w dół"
                  >
                    ↓
                  </button>
                </div>
              </div>

              {payload.kind === "image" && payload.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={payload.url}
                  alt={payload.title}
                  className="max-h-32 rounded border border-zinc-800 object-contain"
                />
              ) : null}
              {payload.kind === "audio" && payload.url ? <audio controls src={payload.url} className="w-full" /> : null}
              {payload.kind === "text" && payload.body ? (
                <p className="line-clamp-3 text-xs text-zinc-400">{payload.body}</p>
              ) : null}
              {payload.kind === "dossier" && payload.fields ? (
                <p className="text-xs text-zinc-500">
                  {payload.fields.length} pól: {payload.fields.map((field) => field.label).join(", ")}
                </p>
              ) : null}

              {editingId === draft.localId ? (
                <CaseFileForm
                  stations={stations}
                  draft={{ initial: draft, onSave: replace }}
                  onDone={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(draft.localId)}
                    className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:text-zinc-100"
                  >
                    Edytuj
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(draft)}
                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:border-red-500/70"
                  >
                    Usuń
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
