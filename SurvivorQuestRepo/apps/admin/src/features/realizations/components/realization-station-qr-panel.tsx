"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import QRCode from "qrcode";
import { useGetRealizationStationQrsQuery } from "../api/realization.api";
import { useGetCurrentRealizationPointsQrCodesQuery } from "@/features/current-realization/api/current-realization.api";
import type { Realization } from "../types/realization";
import {
  buildPointsQrCodeFileName,
  buildStationQrArchiveFileName,
  buildStationQrFileName,
  buildStationQrHuntCodeFileName,
} from "@/shared/lib/station-qr-file-name";
import { addCaptionToQrImageDataUrl } from "@/shared/lib/qr-image-caption";
import {
  QrImageLightbox,
  type QrImageLightboxImage,
} from "@/shared/components/qr-image-lightbox";
import {
  RiskCardsQrPanel,
  type RiskCardQrDownloadEntry,
} from "@/features/risk-quiz/components/risk-cards-qr-panel";

const HUNT_CODE_QR_IMAGE_WIDTH = 180;

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
  if (type === "qr-hunt") {
    return "Skanowanie kodów QR";
  }
  return "Quiz";
}

export function RealizationStationQrPanel({
  realization,
  onClose,
}: RealizationStationQrPanelProps) {
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetRealizationStationQrsQuery(
      {
        realizationId: realization.id,
      },
      {
        refetchOnMountOrArgChange: true,
      },
    );
  const { data: pointsData } = useGetCurrentRealizationPointsQrCodesQuery({
    realizationId: realization.id,
  });
  const [qrImagesByStationId, setQrImagesByStationId] = useState<
    Record<string, string>
  >({});
  const [downloadableQrImagesByStationId, setDownloadableQrImagesByStationId] =
    useState<Record<string, string>>({});
  const [huntCodeImagesByStationId, setHuntCodeImagesByStationId] = useState<
    Record<
      string,
      { code: string; qrImage: string; downloadableQrImage: string }[]
    >
  >({});
  const [qrImagesByPointsCodeId, setQrImagesByPointsCodeId] = useState<
    Record<string, string>
  >({});
  const [
    downloadableQrImagesByPointsCodeId,
    setDownloadableQrImagesByPointsCodeId,
  ] = useState<Record<string, string>>({});
  const [copiedStationId, setCopiedStationId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [lightboxImage, setLightboxImage] =
    useState<QrImageLightboxImage | null>(null);
  const [riskCardDownloadEntries, setRiskCardDownloadEntries] = useState<
    RiskCardQrDownloadEntry[]
  >([]);
  const handleRiskCardsDownloadableChange = useCallback(
    (entries: RiskCardQrDownloadEntry[]) => {
      setRiskCardDownloadEntries(entries);
    },
    [],
  );

  useEffect(() => {
    if (!data) {
      setQrImagesByStationId({});
      setDownloadableQrImagesByStationId({});
      setHuntCodeImagesByStationId({});
      return;
    }

    let cancelled = false;
    setQrImagesByStationId({});
    setDownloadableQrImagesByStationId({});
    setHuntCodeImagesByStationId({});

    void Promise.all(
      data.entries
        .filter((entry) => Boolean(entry.entryUrl))
        .map(async (entry) => {
          const qrImage = await QRCode.toDataURL(entry.entryUrl!, {
            margin: 1,
            width: 280,
            errorCorrectionLevel: "M",
          });
          let downloadableQrImage = qrImage;
          try {
            downloadableQrImage = await addCaptionToQrImageDataUrl(
              qrImage,
              entry.stationName,
            );
          } catch {
            // fallback to original QR without caption
          }

          let huntCodeImages: {
            code: string;
            qrImage: string;
            downloadableQrImage: string;
          }[] = [];
          if (entry.stationType === "qr-hunt" && entry.qrScanCodes.length > 0) {
            huntCodeImages = await Promise.all(
              entry.qrScanCodes.map(async (code) => {
                const codeQrImage = await QRCode.toDataURL(code, {
                  margin: 1,
                  width: HUNT_CODE_QR_IMAGE_WIDTH,
                  errorCorrectionLevel: "M",
                });
                let downloadableCodeQrImage = codeQrImage;
                try {
                  downloadableCodeQrImage = await addCaptionToQrImageDataUrl(
                    codeQrImage,
                    code,
                  );
                } catch {
                  // fallback to original QR without caption
                }
                return {
                  code,
                  qrImage: codeQrImage,
                  downloadableQrImage: downloadableCodeQrImage,
                };
              }),
            );
          }

          return [
            entry.stationId,
            qrImage,
            downloadableQrImage,
            huntCodeImages,
          ] as const;
        }),
    )
      .then((itemsByStation) => {
        if (cancelled) {
          return;
        }

        setQrImagesByStationId(
          Object.fromEntries(
            itemsByStation.map(([stationId, qrImage]) => [stationId, qrImage]),
          ),
        );
        setDownloadableQrImagesByStationId(
          Object.fromEntries(
            itemsByStation.map(([stationId, , downloadableQrImage]) => [
              stationId,
              downloadableQrImage,
            ]),
          ),
        );
        setHuntCodeImagesByStationId(
          Object.fromEntries(
            itemsByStation.map(([stationId, , , huntCodeImages]) => [
              stationId,
              huntCodeImages,
            ]),
          ),
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setQrImagesByStationId({});
        setDownloadableQrImagesByStationId({});
        setHuntCodeImagesByStationId({});
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    if (!pointsData) {
      setQrImagesByPointsCodeId({});
      setDownloadableQrImagesByPointsCodeId({});
      return;
    }

    let cancelled = false;

    void Promise.all(
      pointsData.entries.map(async (entry) => {
        const qrImage = await QRCode.toDataURL(entry.code, {
          margin: 1,
          width: 280,
          errorCorrectionLevel: "M",
        });
        let downloadableQrImage = qrImage;
        try {
          downloadableQrImage = await addCaptionToQrImageDataUrl(
            qrImage,
            entry.label || entry.code,
          );
        } catch {
          // fallback to original QR without caption
        }

        return [entry.id, qrImage, downloadableQrImage] as const;
      }),
    )
      .then((items) => {
        if (cancelled) {
          return;
        }
        setQrImagesByPointsCodeId(
          Object.fromEntries(items.map(([id, qrImage]) => [id, qrImage])),
        );
        setDownloadableQrImagesByPointsCodeId(
          Object.fromEntries(
            items.map(([id, , downloadableQrImage]) => [
              id,
              downloadableQrImage,
            ]),
          ),
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setQrImagesByPointsCodeId({});
        setDownloadableQrImagesByPointsCodeId({});
      });

    return () => {
      cancelled = true;
    };
  }, [pointsData]);

  const completionCodeByStationId = useMemo(() => {
    return new Map(
      realization.scenarioStations
        .map(
          (station) =>
            [station.id, station.completionCode?.trim() ?? ""] as const,
        )
        .filter(([, completionCode]) => Boolean(completionCode)),
    );
  }, [realization.scenarioStations]);
  const downloadableEntries = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.entries
      .map((entry) => ({
        entry,
        qrImage: downloadableQrImagesByStationId[entry.stationId],
      }))
      .filter(
        (
          item,
        ): item is { entry: (typeof data.entries)[number]; qrImage: string } =>
          Boolean(item.qrImage),
      );
  }, [data, downloadableQrImagesByStationId]);
  const downloadableHuntEntries = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.entries.flatMap((entry) =>
      (huntCodeImagesByStationId[entry.stationId] ?? []).map((huntImage) => ({
        entry,
        code: huntImage.code,
        qrImage: huntImage.downloadableQrImage,
      })),
    );
  }, [data, huntCodeImagesByStationId]);
  const downloadablePointsEntries = useMemo(() => {
    if (!pointsData) {
      return [];
    }

    return pointsData.entries
      .map((entry) => ({
        entry,
        qrImage: downloadableQrImagesByPointsCodeId[entry.id],
      }))
      .filter(
        (
          item,
        ): item is {
          entry: (typeof pointsData.entries)[number];
          qrImage: string;
        } => Boolean(item.qrImage),
      );
  }, [pointsData, downloadableQrImagesByPointsCodeId]);
  const downloadableQrCount =
    downloadableEntries.length +
    downloadableHuntEntries.length +
    downloadablePointsEntries.length +
    riskCardDownloadEntries.length;

  async function handleCopyEntryUrl(stationId: string, entryUrl: string) {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(entryUrl);
      setCopiedStationId(stationId);
      window.setTimeout(() => {
        setCopiedStationId((current) =>
          current === stationId ? null : current,
        );
      }, 1500);
    } catch {
      setCopyError("Nie udało się skopiować linku QR.");
    }
  }

  function handleDownloadAllQrs() {
    if (!data) {
      return;
    }
    setCopyError(null);

    if (
      !downloadableEntries.length &&
      !downloadableHuntEntries.length &&
      !downloadablePointsEntries.length &&
      !riskCardDownloadEntries.length
    ) {
      setCopyError("Kody QR nie są jeszcze gotowe do pobrania.");
      return;
    }

    downloadableEntries.forEach(({ entry, qrImage }, index) => {
      window.setTimeout(() => {
        const anchor = document.createElement("a");
        anchor.href = qrImage;
        anchor.download = buildStationQrFileName(
          realization.companyName,
          entry.stationName,
        );
        anchor.click();
      }, index * 100);
    });

    downloadableHuntEntries.forEach(({ entry, code, qrImage }, index) => {
      window.setTimeout(
        () => {
          const anchor = document.createElement("a");
          anchor.href = qrImage;
          anchor.download = buildStationQrHuntCodeFileName(
            realization.companyName,
            entry.stationName,
            code,
          );
          anchor.click();
        },
        (downloadableEntries.length + index) * 100,
      );
    });

    downloadablePointsEntries.forEach(({ entry, qrImage }, index) => {
      window.setTimeout(
        () => {
          const anchor = document.createElement("a");
          anchor.href = qrImage;
          anchor.download = buildPointsQrCodeFileName(
            realization.companyName,
            entry.label,
            entry.code,
          );
          anchor.click();
        },
        (downloadableEntries.length + downloadableHuntEntries.length + index) *
          100,
      );
    });

    riskCardDownloadEntries.forEach(({ fileName, qrImage }, index) => {
      window.setTimeout(
        () => {
          const anchor = document.createElement("a");
          anchor.href = qrImage;
          anchor.download = fileName;
          anchor.click();
        },
        (downloadableEntries.length +
          downloadableHuntEntries.length +
          downloadablePointsEntries.length +
          index) *
          100,
      );
    });
  }

  async function handleDownloadQrZip() {
    if (
      !downloadableEntries.length &&
      !downloadableHuntEntries.length &&
      !downloadablePointsEntries.length &&
      !riskCardDownloadEntries.length
    ) {
      setCopyError("Kody QR nie są jeszcze gotowe do pobrania.");
      return;
    }

    setCopyError(null);
    setIsDownloadingZip(true);

    try {
      const zip = new JSZip();
      const usedFileNameCounts = new Map<string, number>();

      const addQrImageToZip = (baseFileName: string, qrImage: string) => {
        const fileNameCount = (usedFileNameCounts.get(baseFileName) ?? 0) + 1;
        usedFileNameCounts.set(baseFileName, fileNameCount);
        const fileName =
          fileNameCount > 1
            ? baseFileName.replace(/\.png$/i, ` (${fileNameCount}).png`)
            : baseFileName;
        const base64MarkerIndex = qrImage.indexOf("base64,");
        if (base64MarkerIndex < 0) {
          return;
        }
        zip.file(
          fileName,
          qrImage.slice(base64MarkerIndex + "base64,".length),
          { base64: true },
        );
      };

      downloadableEntries.forEach(({ entry, qrImage }) => {
        addQrImageToZip(
          buildStationQrFileName(realization.companyName, entry.stationName),
          qrImage,
        );
      });

      downloadableHuntEntries.forEach(({ entry, code, qrImage }) => {
        addQrImageToZip(
          buildStationQrHuntCodeFileName(
            realization.companyName,
            entry.stationName,
            code,
          ),
          qrImage,
        );
      });

      downloadablePointsEntries.forEach(({ entry, qrImage }) => {
        addQrImageToZip(
          buildPointsQrCodeFileName(
            realization.companyName,
            entry.label,
            entry.code,
          ),
          qrImage,
        );
      });

      riskCardDownloadEntries.forEach(({ fileName, qrImage }) => {
        addQrImageToZip(fileName, qrImage);
      });

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = window.URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = zipUrl;
      anchor.download = buildStationQrArchiveFileName(realization.companyName);
      anchor.click();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(zipUrl);
      }, 1000);
    } catch {
      setCopyError("Nie udało się przygotować paczki ZIP.");
    } finally {
      setIsDownloadingZip(false);
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
              <h2 className="text-xl font-semibold text-zinc-100">
                Stałe kody QR stanowisk
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                {realization.companyName}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Kody są stałe dla wejścia na stanowisko i działają we wszystkich
                realizacjach korzystających z tego samego stanowiska-szablonu.
                Odświeżenie pobiera aktualne dane, bez tworzenia nowych kodów.
              </p>
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
                onClick={handleDownloadAllQrs}
                disabled={downloadableQrCount === 0}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pobierz wszystkie PNG{" "}
                {downloadableQrCount > 0 ? `(${downloadableQrCount})` : ""}
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadQrZip()}
                disabled={downloadableQrCount === 0 || isDownloadingZip}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDownloadingZip
                  ? "Przygotowywanie paczki ZIP..."
                  : `Pobierz paczkę ZIP${downloadableQrCount > 0 ? ` (${downloadableQrCount})` : ""}`}
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
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
              {copyError}
            </div>
          ) : null}

          {isLoading && (
            <p className="text-sm text-zinc-400">Ładowanie kodów QR...</p>
          )}

          {isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <p>Nie udało się pobrać kodów QR dla realizacji.</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-red-100/90">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          )}

          {!isLoading && !isError && data && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.entries.map((entry) => {
                const qrImage = qrImagesByStationId[entry.stationId];
                const downloadableQrImage =
                  downloadableQrImagesByStationId[entry.stationId];
                const fileName = buildStationQrFileName(
                  realization.companyName,
                  entry.stationName,
                );
                const completionCode = completionCodeByStationId.get(
                  entry.stationId,
                );

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
                      <h3 className="text-sm font-semibold text-zinc-100">
                        {entry.stationName}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {getStationTypeLabel(entry.stationType)}
                      </p>
                    </div>

                    <div className="mt-3 flex min-h-[280px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                      {!entry.entryUrl ? (
                        <p className="max-w-[200px] text-center text-xs text-amber-300">
                          Brak kodu QR dla tego stanowiska. Uzupełnij go w
                          edycji realizacji (&bdquo;Wygeneruj&rdquo; lub
                          &bdquo;Zaciągnij ze stanowiska&rdquo;), zanim
                          wydrukujesz naklejki.
                        </p>
                      ) : qrImage ? (
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage({
                              src: qrImage,
                              downloadSrc: downloadableQrImage ?? qrImage,
                              alt: `QR ${entry.stationName}`,
                              downloadFileName: fileName,
                              caption: entry.stationName,
                            })
                          }
                          className="cursor-zoom-in rounded-md transition hover:opacity-90"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={qrImage}
                            alt={`QR ${entry.stationName}`}
                            className="h-64 w-64 rounded-md bg-white p-1"
                          />
                        </button>
                      ) : (
                        <p className="text-xs text-zinc-500">
                          Renderowanie kodu...
                        </p>
                      )}
                    </div>

                    {entry.entryUrl ? (
                      <p className="mt-2 break-all rounded-md border border-zinc-800 bg-zinc-950/70 p-2 text-[11px] text-zinc-400">
                        {entry.entryUrl}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.entryUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyEntryUrl(
                              entry.stationId,
                              entry.entryUrl!,
                            )
                          }
                          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
                        >
                          {copiedStationId === entry.stationId
                            ? "Skopiowano"
                            : "Kopiuj link"}
                        </button>
                      ) : null}
                      {downloadableQrImage ? (
                        <a
                          href={downloadableQrImage}
                          download={fileName}
                          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 transition hover:border-zinc-500"
                        >
                          Pobierz PNG
                        </a>
                      ) : null}
                    </div>

                    {entry.stationType === "qr-hunt" ? (
                      <div className="mt-4 border-t border-zinc-800 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Kody do zeskanowania ({entry.qrScanCodes.length})
                        </p>
                        {entry.qrScanCodes.length === 0 ? (
                          <p className="mt-2 text-xs text-amber-300">
                            Brak zdefiniowanych kodów QR dla tego stanowiska —
                            dodaj je w edycji stanowiska.
                          </p>
                        ) : (
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {(
                              huntCodeImagesByStationId[entry.stationId] ?? []
                            ).map((huntImage) => (
                              <div
                                key={huntImage.code}
                                className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setLightboxImage({
                                      src: huntImage.qrImage,
                                      downloadSrc:
                                        huntImage.downloadableQrImage,
                                      alt: `Kod QR ${huntImage.code}`,
                                      downloadFileName:
                                        buildStationQrHuntCodeFileName(
                                          realization.companyName,
                                          entry.stationName,
                                          huntImage.code,
                                        ),
                                      caption: huntImage.code,
                                    })
                                  }
                                  className="cursor-zoom-in rounded-md transition hover:opacity-90"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={huntImage.qrImage}
                                    alt={`Kod QR ${huntImage.code}`}
                                    className="h-28 w-28 rounded-md bg-white p-1"
                                  />
                                </button>
                                <p
                                  className="w-full truncate text-center text-[10px] text-zinc-400"
                                  title={huntImage.code}
                                >
                                  {huntImage.code}
                                </p>
                                <a
                                  href={huntImage.downloadableQrImage}
                                  download={buildStationQrHuntCodeFileName(
                                    realization.companyName,
                                    entry.stationName,
                                    huntImage.code,
                                  )}
                                  className="rounded-md border border-zinc-700 px-2 py-1 text-[10px] text-zinc-200 transition hover:border-zinc-500"
                                >
                                  Pobierz PNG
                                </a>
                              </div>
                            ))}
                            {entry.qrScanCodes.length >
                            (huntCodeImagesByStationId[entry.stationId]
                              ?.length ?? 0) ? (
                              <p className="col-span-full text-xs text-zinc-500">
                                Renderowanie kodów...
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          {pointsData && pointsData.entries.length > 0 ? (
            <div className="space-y-3 border-t border-zinc-800 pt-5">
              <h3 className="text-sm font-semibold text-zinc-100">
                Kody punktowe
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {pointsData.entries.map((entry) => {
                  const qrImage = qrImagesByPointsCodeId[entry.id];
                  const downloadableQrImage =
                    downloadableQrImagesByPointsCodeId[entry.id];
                  const fileName = buildPointsQrCodeFileName(
                    realization.companyName,
                    entry.label,
                    entry.code,
                  );

                  return (
                    <article
                      key={entry.id}
                      className="relative rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
                    >
                      <div className="absolute right-3 top-3 rounded-md border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-300">
                        {entry.points} pkt
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-zinc-100">
                          {entry.label || entry.code}
                        </h3>
                        <p className="text-xs text-zinc-500">Kod punktowy</p>
                      </div>

                      <div className="mt-3 flex min-h-[280px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                        {qrImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxImage({
                                src: qrImage,
                                downloadSrc: downloadableQrImage ?? qrImage,
                                alt: `Kod QR ${entry.code}`,
                                downloadFileName: fileName,
                                caption: entry.label || entry.code,
                              })
                            }
                            className="cursor-zoom-in rounded-md transition hover:opacity-90"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={qrImage}
                              alt={`Kod QR ${entry.code}`}
                              className="h-64 w-64 rounded-md bg-white p-1"
                            />
                          </button>
                        ) : (
                          <p className="text-xs text-zinc-500">
                            Renderowanie kodu...
                          </p>
                        )}
                      </div>

                      <p className="mt-2 break-all rounded-md border border-zinc-800 bg-zinc-950/70 p-2 text-[11px] text-zinc-400">
                        {entry.code}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {downloadableQrImage ? (
                          <a
                            href={downloadableQrImage}
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
            </div>
          ) : null}

          {realization.type === "risk-quiz" ? (
            <div className="space-y-3 border-t border-zinc-800 pt-5">
              <h3 className="text-sm font-semibold text-zinc-100">
                Karty QR do wydruku
              </h3>
              <RiskCardsQrPanel
                realizationId={realization.id}
                realizationName={realization.companyName}
                onDownloadableCardsChange={handleRiskCardsDownloadableChange}
              />
            </div>
          ) : null}
        </div>
      </aside>

      <QrImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}
