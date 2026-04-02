"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useGetRealizationStationQrsQuery } from "../api/realization.api";
import type { Realization } from "../types/realization";

type RealizationStationQrPanelProps = {
  realization: Realization;
  onClose: () => void;
};

function getStationTypeLabel(type: string) {
  if (type === "time") {
    return "Na czas";
  }
  if (type === "points") {
    return "Na punkty";
  }
  if (type === "wordle") {
    return "Wordle";
  }
  if (type === "hangman") {
    return "Wisielec";
  }
  return "Quiz";
}

export function RealizationStationQrPanel({ realization, onClose }: RealizationStationQrPanelProps) {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetRealizationStationQrsQuery(
    {
      realizationId: realization.id,
    },
    {
      refetchOnMountOrArgChange: true,
    },
  );
  const [qrImagesByStationId, setQrImagesByStationId] = useState<Record<string, string>>({});
  const [copiedStationId, setCopiedStationId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      setQrImagesByStationId({});
      return;
    }

    let cancelled = false;
    setQrImagesByStationId({});

    void Promise.all(
      data.entries.map(async (entry) => [
        entry.stationId,
        await QRCode.toDataURL(entry.entryUrl, {
          margin: 1,
          width: 280,
          errorCorrectionLevel: "M",
        }),
      ]),
    )
      .then((items) => {
        if (cancelled) {
          return;
        }

        setQrImagesByStationId(Object.fromEntries(items));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setQrImagesByStationId({});
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  const expiresLabel = useMemo(() => {
    if (!data?.expiresAt) {
      return null;
    }
    return new Date(data.expiresAt).toLocaleString("pl-PL");
  }, [data?.expiresAt]);
  const completionCodeByStationId = useMemo(() => {
    return new Map(
      realization.scenarioStations
        .map((station) => [station.id, station.completionCode?.trim() ?? ""] as const)
        .filter(([, completionCode]) => Boolean(completionCode)),
    );
  }, [realization.scenarioStations]);

  async function handleCopyEntryUrl(stationId: string, entryUrl: string) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(entryUrl);
      setCopiedStationId(stationId);
      window.setTimeout(() => {
        setCopiedStationId((current) => (current === stationId ? null : current));
      }, 1500);
    } catch {
      setCopyError("Nie udało się skopiować linku QR.");
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij panel kodów QR"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-zinc-950/70"
      />

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-6xl overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">Stałe kody QR stanowisk</h2>
              <p className="mt-1 text-sm text-zinc-400">{realization.companyName}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Kody są stałe dla wejścia na stanowisko. Odświeżenie pobiera aktualne dane, bez tworzenia nowych kodów.
              </p>
              {expiresLabel ? (
                <p className="mt-1 text-xs text-zinc-500">Ważne do: {expiresLabel}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
              >
                {isFetching ? "Odświeżanie danych..." : "Odśwież dane"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500"
              >
                Zamknij
              </button>
            </div>
          </div>

          {copyError ? (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{copyError}</div>
          ) : null}

          {isLoading && <p className="text-sm text-zinc-400">Ładowanie kodów QR...</p>}

          {isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p>Nie udało się pobrać kodów QR dla realizacji.</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-red-100/90">{JSON.stringify(error, null, 2)}</pre>
            </div>
          )}

          {!isLoading && !isError && data && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.entries.map((entry) => {
                const qrImage = qrImagesByStationId[entry.stationId];
                const fileName = `qr-${realization.id}-${entry.stationId}.png`;
                const completionCode = completionCodeByStationId.get(entry.stationId);

                return (
                  <article
                    key={entry.stationId}
                    className="relative rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
                  >
                    {completionCode ? (
                      <div className="absolute right-3 top-3 rounded-md border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-300">
                        Kod: {completionCode}
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-zinc-100">{entry.stationName}</h3>
                      <p className="text-xs text-zinc-500">{getStationTypeLabel(entry.stationType)}</p>
                    </div>

                    <div className="mt-3 flex min-h-[280px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                      {qrImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrImage} alt={`QR ${entry.stationName}`} className="h-64 w-64 rounded-md bg-white p-1" />
                      ) : (
                        <p className="text-xs text-zinc-500">Renderowanie kodu...</p>
                      )}
                    </div>

                    <p className="mt-2 break-all rounded-md border border-zinc-800 bg-zinc-950/70 p-2 text-[11px] text-zinc-400">
                      {entry.entryUrl}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopyEntryUrl(entry.stationId, entry.entryUrl)}
                        className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
                      >
                        {copiedStationId === entry.stationId ? "Skopiowano" : "Kopiuj link"}
                      </button>
                      {qrImage ? (
                        <a
                          href={qrImage}
                          download={fileName}
                          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
                        >
                          Pobierz PNG
                        </a>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
