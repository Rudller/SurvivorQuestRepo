"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { GalleryPhoto } from "../types";

type GalleryLightboxProps = {
  photo: GalleryPhoto | null;
  onClose: () => void;
};

export function GalleryLightbox({ photo, onClose }: GalleryLightboxProps) {
  useEffect(() => {
    if (!photo) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [photo, onClose]);

  if (!photo) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full border border-[#446251] bg-[#12221b]/80 px-3 py-1.5 text-sm font-medium text-[#f3f5ef] transition hover:border-[#f0c977]/60 hover:text-[#f0c977]"
      >
        Zamknij
      </button>

      <div
        className="relative h-[80vh] w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src={photo.url}
          alt={photo.stationName ?? photo.teamName ?? "Zdjęcie z galerii"}
          fill
          sizes="100vw"
          className="rounded-xl object-contain"
        />
      </div>

      <div className="text-center text-sm text-[#bdcdbf]">
        {photo.teamName ? <span className="font-semibold text-[#f3f5ef]">{photo.teamName}</span> : null}
        {photo.stationName ? <span> • {photo.stationName}</span> : null}
      </div>
    </div>
  );
}
