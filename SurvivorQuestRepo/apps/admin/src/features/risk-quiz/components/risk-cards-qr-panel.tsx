"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  useGenerateRiskCardsMutation,
  useGetRiskCardsQuery,
} from "../api/risk-quiz.api";
import { RISK_DIFFICULTY_OPTIONS } from "../types/risk-quiz";
import { buildRiskCardQrFileName } from "@/shared/lib/station-qr-file-name";
import { renderRiskCardImage, riskCardOrdinal } from "../lib/risk-card-image";
import {
  QrImageLightbox,
  type QrImageLightboxImage,
} from "@/shared/components/qr-image-lightbox";

export type RiskCardQrDownloadEntry = {
  fileName: string;
  qrImage: string;
};

type RiskCardsQrPanelProps = {
  realizationId: string;
  realizationName: string;
  onDownloadableQrsChange?: (entries: RiskCardQrDownloadEntry[]) => void;
  onDownloadableCardsChange?: (entries: RiskCardQrDownloadEntry[]) => void;
};

const QR_IMAGE_WIDTH = 350;

function difficultyLabel(value: string) {
  return (
    RISK_DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label ??
    value
  );
}

export function RiskCardsQrPanel({
  realizationId,
  realizationName,
  onDownloadableQrsChange,
  onDownloadableCardsChange,
}: RiskCardsQrPanelProps) {
  const {
    data: cards,
    isLoading,
    isError,
  } = useGetRiskCardsQuery({ realizationId });
  const [generateMissingCards, { isLoading: isGeneratingMissingCards }] =
    useGenerateRiskCardsMutation();
  const [qrImagesByCardId, setQrImagesByCardId] = useState<
    Record<string, string>
  >({});
  const [cardImagesByCardId, setCardImagesByCardId] = useState<
    Record<string, string>
  >({});
  const [showPrintableCards, setShowPrintableCards] = useState(false);
  const [isGeneratingCardImages, setIsGeneratingCardImages] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] =
    useState<QrImageLightboxImage | null>(null);

  useEffect(() => {
    if (!cards) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      cards.map(async (card) => {
        const qrImage = await QRCode.toDataURL(card.code, {
          margin: 2,
          width: QR_IMAGE_WIDTH,
          errorCorrectionLevel: "M",
        });
        return [card.id, qrImage] as const;
      }),
    ).then((items) => {
      if (!cancelled) {
        setQrImagesByCardId(Object.fromEntries(items));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cards]);

  async function handleGenerateCardImages() {
    if (!cards || cards.length === 0 || isGeneratingCardImages) {
      return;
    }

    setGenerationError(null);
    setIsGeneratingCardImages(true);
    try {
      const items = await Promise.all(
        cards.map(async (card) => {
          const qrImage =
            qrImagesByCardId[card.id] ??
            (await QRCode.toDataURL(card.code, {
              margin: 2,
              width: QR_IMAGE_WIDTH,
              errorCorrectionLevel: "M",
            }));
          const cardImage = await renderRiskCardImage({
            qrImage,
            categoryName: card.category.name,
            difficulty: card.difficulty,
            ordinal: riskCardOrdinal(card.code),
          });
          return [card.id, cardImage] as const;
        }),
      );
      setCardImagesByCardId(Object.fromEntries(items));
      setShowPrintableCards(true);
    } catch {
      setGenerationError("Nie udało się wygenerować gotowych kart.");
    } finally {
      setIsGeneratingCardImages(false);
    }
  }

  useEffect(() => {
    if (!onDownloadableQrsChange) {
      return;
    }

    const entries = (cards ?? [])
      .map((card) => {
        const qrImage = qrImagesByCardId[card.id];
        return qrImage
          ? {
              fileName: buildRiskCardQrFileName(
                realizationName,
                card.category.name,
                card.code,
              ),
              qrImage,
            }
          : null;
      })
      .filter((entry): entry is RiskCardQrDownloadEntry => Boolean(entry));
    onDownloadableQrsChange(entries);
  }, [cards, qrImagesByCardId, realizationName, onDownloadableQrsChange]);

  useEffect(() => {
    if (!onDownloadableCardsChange) {
      return;
    }

    if (!cards) {
      onDownloadableCardsChange([]);
      return;
    }

    const entries = cards
      .map((card) => {
        const cardImage = cardImagesByCardId[card.id];
        if (!cardImage) {
          return null;
        }
        return {
          fileName: buildRiskCardQrFileName(
            realizationName,
            card.category.name,
            card.code,
          ),
          qrImage: cardImage,
        };
      })
      .filter((entry): entry is RiskCardQrDownloadEntry => Boolean(entry));

    onDownloadableCardsChange(entries);
  }, [cards, cardImagesByCardId, realizationName, onDownloadableCardsChange]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Każda kombinacja kategoria × poziom trudności dostaje 10 osobnych kart
        QR. Domyślnie wyświetlane są same kody. Przycisk „Wygeneruj karty”
        umieszcza je na szablonach razem z kategorią, numerem i ikoną.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void generateMissingCards({ realizationId })}
          disabled={isGeneratingMissingCards}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 disabled:opacity-60"
        >
          {isGeneratingMissingCards
            ? "Generowanie kodów..."
            : "Wygeneruj brakujące kody QR"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (showPrintableCards) {
              setShowPrintableCards(false);
              return;
            }
            void handleGenerateCardImages();
          }}
          disabled={isGeneratingCardImages || !cards?.length}
          className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
        >
          {isGeneratingCardImages
            ? "Generowanie kart..."
            : showPrintableCards
              ? "Pokaż same QR"
              : "Wygeneruj karty"}
        </button>
      </div>

      {generationError ? <p className="text-xs text-red-300">{generationError}</p> : null}

      {isLoading && <p className="text-sm text-zinc-400">Ładowanie kart...</p>}
      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          Nie udało się pobrać kart Ryzykantów.
        </div>
      )}
      {!isLoading && !isError && cards && cards.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Brak kart. Dodaj kategorie i pytania, a potem wygeneruj karty.
        </p>
      ) : null}

      {!isLoading && !isError && cards && cards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const qrImage = qrImagesByCardId[card.id];
            const cardImage = cardImagesByCardId[card.id];
            const displayImage = showPrintableCards ? cardImage : qrImage;
            const isShowingCard = showPrintableCards && Boolean(cardImage);
            const caption = card.code;
            const fileName = buildRiskCardQrFileName(
              realizationName,
              card.category.name,
              card.code,
            );

            return (
              <article
                key={card.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <h3 className="text-sm font-semibold text-zinc-100">
                  {card.category.name} — {difficultyLabel(card.difficulty)}
                </h3>
                <p className="text-xs text-zinc-500">{card.code}</p>
                <div className="mt-3 flex min-h-56 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
                  {displayImage ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          src: displayImage,
                          downloadSrc: displayImage,
                          alt: isShowingCard
                            ? `Karta ${card.category.name} ${riskCardOrdinal(card.code)}`
                            : `Kod QR ${card.code}`,
                          downloadFileName: fileName,
                          caption,
                        })
                      }
                      className="cursor-zoom-in rounded-md transition hover:opacity-90"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayImage}
                        alt={
                          isShowingCard
                            ? `Karta ${card.category.name} ${riskCardOrdinal(card.code)}`
                            : `Kod QR ${card.code}`
                        }
                        className={
                          isShowingCard
                            ? "h-auto max-h-96 w-auto rounded-md"
                            : "h-48 w-48 rounded-md bg-white p-1"
                        }
                      />
                    </button>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      Renderowanie kodu...
                    </p>
                  )}
                </div>
                {displayImage ? (
                  <a
                    href={displayImage}
                    download={fileName}
                    className="mt-3 block rounded-md border border-zinc-700 px-2.5 py-1.5 text-center text-xs text-zinc-200 transition hover:border-zinc-500"
                  >
                    {isShowingCard ? "Pobierz gotową kartę PNG" : "Pobierz QR PNG"}
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      <QrImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
