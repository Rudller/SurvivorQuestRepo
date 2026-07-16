"use client";

import { useState } from "react";
import type { MediaAsset } from "../api/realization.api";
import { useDeleteMediaAssetMutation } from "../api/realization.api";

interface MediaLibraryGridProps {
  title: string;
  assets: MediaAsset[];
  usedByUrl: Map<string, string[]>;
}

export function MediaLibraryGrid({ title, assets, usedByUrl }: MediaLibraryGridProps) {
  const [deleteMediaAsset, { isLoading: isDeleting }] = useDeleteMediaAssetMutation();
  const [pendingDeleteUrl, setPendingDeleteUrl] = useState<string | null>(null);
  const [errorByUrl, setErrorByUrl] = useState<Record<string, string>>({});

  if (assets.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{title}</h2>
        <p className="text-sm text-zinc-500">Brak wgranych plików.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">{title}</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {assets.map((asset) => {
          const usedBy = usedByUrl.get(asset.url) ?? [];
          const error = errorByUrl[asset.url];

          return (
            <div key={asset.key} className="min-w-0 space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt={asset.key}
                className="h-24 w-full rounded-md border border-zinc-700 object-cover"
              />
              <p className="text-xs break-words text-zinc-400">
                {usedBy.length > 0 ? `Używane przez: ${usedBy.join(", ")}` : "Nieużywane w tym środowisku"}
              </p>

              {pendingDeleteUrl === asset.url ? (
                <div className="min-w-0 space-y-1.5 rounded-md border border-red-500/40 bg-red-500/10 p-2">
                  <p className="text-xs break-words text-red-200">
                    {usedBy.length > 0
                      ? `Plik jest używany przez: ${usedBy.join(", ")}. Usunięcie wyczyści te referencje.`
                      : "Na pewno usunąć ten plik?"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={async () => {
                        setErrorByUrl((prev) => ({ ...prev, [asset.url]: "" }));
                        try {
                          await deleteMediaAsset({ url: asset.url }).unwrap();
                          setPendingDeleteUrl(null);
                        } catch {
                          setErrorByUrl((prev) => ({ ...prev, [asset.url]: "Nie udało się usunąć pliku." }));
                        }
                      }}
                      className="flex-1 rounded-md bg-red-500 px-2 py-1 text-xs font-medium text-white transition hover:bg-red-400"
                    >
                      Tak, usuń
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteUrl(null)}
                      className="flex-1 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200 transition hover:border-zinc-500"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingDeleteUrl(asset.url)}
                  className="w-full rounded-md border border-zinc-700 px-2 py-1 text-xs text-red-300 transition hover:border-red-400/60 hover:text-red-200"
                >
                  Usuń
                </button>
              )}

              {error && <p className="text-xs text-red-300">{error}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
