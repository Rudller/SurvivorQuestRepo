"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import QRCode from "qrcode";
import { useGetCurrentRealizationStationQrsQuery } from "../api/current-realization.api";
import type { CurrentRealizationOverview } from "../types/current-realization-overview";
import { buildStationQrArchiveFileName, buildStationQrFileName } from "@/shared/lib/station-qr-file-name";

type CurrentRealizationStationQrPanelProps = {
  realization: CurrentRealizationOverview["realization"];
  selectedRealizationId?: string;
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

const QR_IMAGE_WIDTH = 280;
const QR_CAPTION_HORIZONTAL_PADDING = 18;
const QR_CAPTION_VERTICAL_PADDING = 14;
const QR_CAPTION_FONT_SIZE = 18;
const QR_CAPTION_LINE_HEIGHT = 22;
const QR_CAPTION_MAX_LINES = 2;

function trimCaptionToWidth(
  context: CanvasRenderingContext2D,
  caption: string,
  maxWidth: number,
) {
  if (context.measureText(caption).width <= maxWidth) {
    return caption;
  }

  let trimmed = caption;
  while (trimmed.length > 0 && context.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length > 0 ? `${trimmed}…` : "…";
}

function buildCaptionLines(
  context: CanvasRenderingContext2D,
  caption: string,
  maxWidth: number,
) {
  const words = caption.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }

  const lines: string[] = [];
  let currentLine = words.shift() ?? "";

  words.forEach((word) => {
    if (lines.length >= QR_CAPTION_MAX_LINES - 1) {
      currentLine = `${currentLine} ${word}`.trim();
      return;
    }

    const nextLine = `${currentLine} ${word}`.trim();
    if (context.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  lines.push(currentLine);

  if (lines.length <= QR_CAPTION_MAX_LINES) {
    const normalizedLastIndex = lines.length - 1;
    lines[normalizedLastIndex] = trimCaptionToWidth(context, lines[normalizedLastIndex] ?? "", maxWidth);
    return lines;
  }

  const trimmed = lines.slice(0, QR_CAPTION_MAX_LINES);
  const lastIndex = trimmed.length - 1;
  trimmed[lastIndex] = trimCaptionToWidth(context, trimmed[lastIndex] ?? "", maxWidth);
  return trimmed;
}

function addCaptionToQrImageDataUrl(qrImageDataUrl: string, caption: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Brak kontekstu canvas dla podpisu QR."));
          return;
        }

        context.font = `600 ${QR_CAPTION_FONT_SIZE}px Arial, sans-serif`;
        const lines = buildCaptionLines(
          context,
          caption,
          Math.max(1, image.width - QR_CAPTION_HORIZONTAL_PADDING * 2),
        );
        const normalizedLines = lines.length > 0 ? lines : [caption];
        const captionAreaHeight =
          QR_CAPTION_VERTICAL_PADDING * 2 + normalizedLines.length * QR_CAPTION_LINE_HEIGHT;

        canvas.width = image.width;
        canvas.height = image.height + captionAreaHeight;

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, image.width, image.height);

        context.font = `600 ${QR_CAPTION_FONT_SIZE}px Arial, sans-serif`;
        context.fillStyle = "#111827";
        context.textAlign = "center";
        context.textBaseline = "top";

        normalizedLines.forEach((line, lineIndex) => {
          const y = image.height + QR_CAPTION_VERTICAL_PADDING + lineIndex * QR_CAPTION_LINE_HEIGHT;
          context.fillText(line, canvas.width / 2, y, canvas.width - QR_CAPTION_HORIZONTAL_PADDING * 2);
        });

        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      reject(new Error("Nie udało się załadować obrazu QR do dodania podpisu."));
    };
    image.src = qrImageDataUrl;
  });
}

export function CurrentRealizationStationQrPanel({
  realization,
  selectedRealizationId,
  onClose,
}: CurrentRealizationStationQrPanelProps) {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGetCurrentRealizationStationQrsQuery({ realizationId: selectedRealizationId }, {
    refetchOnMountOrArgChange: true,
  });
  const [qrImagesByStationId, setQrImagesByStationId] = useState<Record<string, string>>({});
  const [downloadableQrImagesByStationId, setDownloadableQrImagesByStationId] = useState<Record<string, string>>({});
  const [copiedStationId, setCopiedStationId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  useEffect(() => {
    if (!data) {
      setQrImagesByStationId({});
      setDownloadableQrImagesByStationId({});
      return;
    }

    let cancelled = false;
    setQrImagesByStationId({});
    setDownloadableQrImagesByStationId({});

    void Promise.all(
      data.entries.map(async (entry) => {
        const qrImage = await QRCode.toDataURL(entry.entryUrl, {
          margin: 1,
          width: QR_IMAGE_WIDTH,
          errorCorrectionLevel: "M",
        });
        let downloadableQrImage = qrImage;
        try {
          downloadableQrImage = await addCaptionToQrImageDataUrl(qrImage, entry.stationName);
        } catch {
          // fallback to original QR without caption
        }

        return [entry.stationId, qrImage, downloadableQrImage] as const;
      }),
    )
      .then((itemsByStation) => {
        if (cancelled) {
          return;
        }

        setQrImagesByStationId(
          Object.fromEntries(itemsByStation.map(([stationId, qrImage]) => [stationId, qrImage])),
        );
        setDownloadableQrImagesByStationId(
          Object.fromEntries(itemsByStation.map(([stationId, , downloadableQrImage]) => [stationId, downloadableQrImage])),
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setQrImagesByStationId({});
        setDownloadableQrImagesByStationId({});
      });

    return () => {
      cancelled = true;
    };
  }, [data]);

  const expiresLabel = data?.expiresAt ? new Date(data.expiresAt).toLocaleString("pl-PL") : null;
  const downloadableEntries = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.entries
      .map((entry) => ({ entry, qrImage: downloadableQrImagesByStationId[entry.stationId] }))
      .filter((item): item is { entry: (typeof data.entries)[number]; qrImage: string } => Boolean(item.qrImage));
  }, [data, downloadableQrImagesByStationId]);
  const downloadableQrCount = downloadableEntries.length;

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

  function handleDownloadAllQrs() {
    if (!data) {
      return;
    }
    setCopyError(null);

    if (!downloadableEntries.length) {
      setCopyError("Kody QR nie są jeszcze gotowe do pobrania.");
      return;
    }

    downloadableEntries.forEach(({ entry, qrImage }, index) => {
      window.setTimeout(() => {
        const anchor = document.createElement("a");
        anchor.href = qrImage;
        anchor.download = buildStationQrFileName(realization.companyName, entry.stationName);
        anchor.click();
      }, index * 100);
    });
  }

  async function handleDownloadQrZip() {
    if (!downloadableEntries.length) {
      setCopyError("Kody QR nie są jeszcze gotowe do pobrania.");
      return;
    }

    setCopyError(null);
    setIsDownloadingZip(true);

    try {
      const zip = new JSZip();
      const usedFileNameCounts = new Map<string, number>();

      downloadableEntries.forEach(({ entry, qrImage }) => {
        const baseFileName = buildStationQrFileName(realization.companyName, entry.stationName);
        const fileNameCount = (usedFileNameCounts.get(baseFileName) ?? 0) + 1;
        usedFileNameCounts.set(baseFileName, fileNameCount);
        const fileName =
          fileNameCount > 1 ? baseFileName.replace(/\.png$/i, ` (${fileNameCount}).png`) : baseFileName;
        const base64MarkerIndex = qrImage.indexOf("base64,");
        if (base64MarkerIndex < 0) {
          return;
        }
        zip.file(fileName, qrImage.slice(base64MarkerIndex + "base64,".length), { base64: true });
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
                onClick={handleDownloadAllQrs}
                disabled={downloadableQrCount === 0}
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pobierz wszystkie PNG {downloadableQrCount > 0 ? `(${downloadableQrCount})` : ""}
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
                const fileName = buildStationQrFileName(realization.companyName, entry.stationName);
                const downloadableQrImage = downloadableQrImagesByStationId[entry.stationId];

                return (
                  <article
                    key={entry.stationId}
                    className="relative rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
                  >
                    {entry.completionCode ? (
                      <div className="absolute right-3 top-3 rounded-md border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-300">
                        Kod: {entry.completionCode}
                      </div>
                    ) : null}
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-zinc-100">{entry.stationName}</h3>
                      <p className="text-xs text-zinc-500">{getStationTypeLabel(entry.stationType)}</p>
                    </div>

                    <div className="mt-3 flex min-h-70 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
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
          )}
        </div>
      </aside>
    </>
  );
}
