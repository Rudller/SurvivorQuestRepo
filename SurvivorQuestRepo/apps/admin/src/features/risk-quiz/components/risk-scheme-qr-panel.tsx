"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { useGetRiskSchemeCardCodesQuery } from "../api/risk-quiz.api";
import { RISK_DIFFICULTY_OPTIONS } from "../types/risk-quiz";
import {
  buildRiskCardQrFileName,
  buildStationQrArchiveFileName,
} from "@/shared/lib/station-qr-file-name";
import { downloadQrImagesAsZip } from "@/shared/lib/qr-zip";
import {
  QrImageLightbox,
  type QrImageLightboxImage,
} from "@/shared/components/qr-image-lightbox";

type RiskSchemeQrPanelProps = {
  schemeId: string;
  schemeName: string;
  onClose: () => void;
};

const QR_IMAGE_WIDTH = 220;

function difficultyLabel(value: string) {
  return (
    RISK_DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

/**
 * Printable QR sheet for a deck in the library, before any realization exists.
 *
 * The codes come from the backend rather than being built here: the format
 * lives in one place (buildRiskCardCode) so a sheet printed from the library
 * can never drift from the cards a realization later generates.
 */
export function RiskSchemeQrPanel({
  schemeId,
  schemeName,
  onClose,
}: RiskSchemeQrPanelProps) {
  const {
    data: codes,
    isLoading,
    isError,
  } = useGetRiskSchemeCardCodesQuery({ schemeId });
  const [qrImagesByCode, setQrImagesByCode] = useState<Record<string, string>>(
    {},
  );
  const [lightboxImage, setLightboxImage] =
    useState<QrImageLightboxImage | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!codes) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      codes.map(async (entry) => {
        const qrImage = await QRCode.toDataURL(entry.code, {
          margin: 1,
          width: QR_IMAGE_WIDTH,
          errorCorrectionLevel: "M",
        });
        return [entry.code, qrImage] as const;
      }),
    ).then((items) => {
      if (!cancelled) {
        setQrImagesByCode(Object.fromEntries(items));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [codes]);

  const downloadableEntries = useMemo(
    () =>
      (codes ?? [])
        .map((entry) => {
          const qrImage = qrImagesByCode[entry.code];
          if (!qrImage) {
            return null;
          }
          return {
            fileName: buildRiskCardQrFileName(
              schemeName,
              entry.categoryName,
              entry.code,
            ),
            qrImage,
          };
        })
        .filter((entry): entry is { fileName: string; qrImage: string } =>
          Boolean(entry),
        ),
    [codes, qrImagesByCode, schemeName],
  );

  async function handleDownloadZip() {
    if (downloadableEntries.length === 0) {
      setDownloadError("Kody QR nie są jeszcze gotowe do pobrania.");
      return;
    }

    setDownloadError(null);
    setIsDownloading(true);
    try {
      await downloadQrImagesAsZip(
        downloadableEntries,
        buildStationQrArchiveFileName(`${schemeName} - Ryzykanci`),
      );
    } catch {
      setDownloadError("Nie udało się przygotować paczki ZIP.");
    } finally {
      setIsDownloading(false);
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

      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-6xl space-y-5 overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">
              Kody QR do druku
            </h2>
            <p className="mt-1 text-sm text-zinc-400">{schemeName}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Kody są wyliczane z kategorii tej talii, więc możesz je
              wydrukować, zanim powstanie jakakolwiek realizacja — ta sama
              naklejka zadziała w każdej realizacji zbudowanej na tej talii.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void handleDownloadZip()}
              disabled={isDownloading || downloadableEntries.length === 0}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-200 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDownloading
                ? "Przygotowywanie paczki ZIP..."
                : `Pobierz paczkę ZIP${downloadableEntries.length > 0 ? ` (${downloadableEntries.length})` : ""}`}
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

        {downloadError ? (
          <p className="text-xs text-red-300">{downloadError}</p>
        ) : null}

      {isLoading ? (
        <p className="text-sm text-zinc-400">Ładowanie kodów...</p>
      ) : null}
      {isError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          Nie udało się pobrać kodów tej talii.
        </div>
      ) : null}
      {!isLoading && !isError && codes && codes.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Ta talia nie ma jeszcze kategorii, więc nie ma czego drukować.
        </p>
      ) : null}

      {!isLoading && !isError && codes && codes.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {codes.map((entry) => {
            const qrImage = qrImagesByCode[entry.code];
            const fileName = buildRiskCardQrFileName(
              schemeName,
              entry.categoryName,
              entry.code,
            );

            return (
              <article
                key={entry.code}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
              >
                <h4 className="text-sm font-semibold text-zinc-100">
                  {entry.categoryName} — {difficultyLabel(entry.difficulty)}
                </h4>
                <p className="text-[11px] break-all text-zinc-500">
                  {entry.code}
                </p>
                <div className="mt-2 flex min-h-48 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                  {qrImage ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          src: qrImage,
                          downloadSrc: qrImage,
                          alt: `Kod QR ${entry.code}`,
                          downloadFileName: fileName,
                          caption: entry.code,
                        })
                      }
                      className="cursor-zoom-in rounded-md transition hover:opacity-90"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrImage}
                        alt={`Kod QR ${entry.code}`}
                        className="h-40 w-40 rounded-md bg-white p-1"
                      />
                    </button>
                  ) : (
                    <p className="text-xs text-zinc-500">Renderowanie kodu...</p>
                  )}
                </div>
                {qrImage ? (
                  <a
                    href={qrImage}
                    download={fileName}
                    className="mt-2 block rounded-md border border-zinc-700 px-2.5 py-1.5 text-center text-xs text-zinc-200 transition hover:border-zinc-500"
                  >
                    Pobierz PNG
                  </a>
                ) : null}
              </article>
            );
          })}
          </div>
        ) : null}
      </aside>

      <QrImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </>
  );
}
