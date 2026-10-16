"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "../types";
import { photoCaption } from "../lib/photo-labels";

type GalleryLightboxProps = {
  photos: GalleryPhoto[];
  activePhotoId: string | null;
  onChangePhoto: (photoId: string) => void;
  onClose: () => void;
  onDownloadPhoto: (photo: GalleryPhoto) => Promise<void>;
};

/** Minimalny poziomy ruch palca, który liczy się jako przesunięcie, a nie stuknięcie. */
const SWIPE_THRESHOLD_PX = 50;

export function GalleryLightbox({ photos, activePhotoId, onChangePhoto, onClose, onDownloadPhoto }: GalleryLightboxProps) {
  const index = activePhotoId ? photos.findIndex((photo) => photo.id === activePhotoId) : -1;
  const photo = index >= 0 ? photos[index] : null;
  const touchStartX = useRef<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const showOffset = useCallback(
    (offset: number) => {
      if (index < 0 || photos.length < 2) {
        return;
      }
      const next = photos[(index + offset + photos.length) % photos.length];
      if (next) {
        setDownloadError(null);
        onChangePhoto(next.id);
      }
    },
    [index, photos, onChangePhoto],
  );

  useEffect(() => {
    if (!photo) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight") {
        showOffset(1);
      } else if (event.key === "ArrowLeft") {
        showOffset(-1);
      }
    };

    // Strona pod spodem nie przewija się, gdy oglądamy zdjęcie.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [photo, onClose, showOffset]);

  if (!photo) {
    return null;
  }

  async function handleDownload() {
    if (!photo) {
      return;
    }
    setDownloadError(null);
    setIsDownloading(true);
    try {
      await onDownloadPhoto(photo);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Nie udało się pobrać zdjęcia.");
    } finally {
      setIsDownloading(false);
    }
  }

  const caption = photoCaption(photo);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-obsidian/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`${photo.teamName ?? "Drużyna"}: ${caption}`}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start === null || end === undefined) {
          return;
        }
        const delta = end - start;
        if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) {
          showOffset(delta < 0 ? 1 : -1);
        }
      }}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="text-sm text-ivory-muted">
          {photos.length > 1 ? `${index + 1} z ${photos.length}` : null}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDownload()}
            disabled={isDownloading}
            className="rounded-full bg-amber px-4 py-2 text-sm font-semibold text-obsidian transition hover:bg-amber-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber disabled:cursor-wait disabled:opacity-70"
          >
            {isDownloading ? "Pobieram…" : "Pobierz zdjęcie"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line bg-graphite/80 px-4 py-2 text-sm font-medium text-ivory transition hover:border-amber/60 hover:text-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
          >
            Zamknij
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" onClick={onClose}>
        {/* `key` przebudowuje obraz przy każdej zmianie — nowe zdjęcie wjeżdża
            własnym fade'em zamiast mignąć na miejscu poprzedniego. */}
        <div key={photo.id} className="relative h-full w-full animate-[sq-fade-up_260ms_ease-out_both] motion-reduce:animate-none">
          <Image
            src={photo.url}
            alt={`${photo.teamName ?? "Drużyna"}: ${caption}`}
            fill
            sizes="100vw"
            className="object-contain"
            onClick={(event) => event.stopPropagation()}
            priority
          />
        </div>

        {photos.length > 1 ? (
          <>
            <LightboxArrow direction="previous" onClick={() => showOffset(-1)} />
            <LightboxArrow direction="next" onClick={() => showOffset(1)} />
          </>
        ) : null}
      </div>

      <div className="px-4 pb-5 pt-3 text-center sm:px-6">
        <p className="text-base font-semibold text-ivory">{photo.teamName ?? "Drużyna"}</p>
        <p className="text-sm text-ivory-muted">{caption}</p>
        {downloadError ? <p className="mt-2 text-sm text-alert">{downloadError}</p> : null}
      </div>
    </div>
  );
}

function LightboxArrow({ direction, onClick }: { direction: "previous" | "next"; onClick: () => void }) {
  const isNext = direction === "next";
  return (
    <button
      type="button"
      aria-label={isNext ? "Następne zdjęcie" : "Poprzednie zdjęcie"}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-graphite/80 text-ivory transition hover:border-amber/60 hover:text-amber focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber sm:flex ${
        isNext ? "right-3" : "left-3"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d={isNext ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
