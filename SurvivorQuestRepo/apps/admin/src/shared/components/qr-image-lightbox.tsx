"use client";

export type QrImageLightboxImage = {
  src: string;
  downloadSrc?: string;
  alt: string;
  downloadFileName: string;
  caption?: string;
};

type QrImageLightboxProps = {
  image: QrImageLightboxImage | null;
  onClose: () => void;
};

export function QrImageLightbox({ image, onClose }: QrImageLightboxProps) {
  if (!image) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Zamknij podgląd kodu QR"
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-zinc-950/85"
      />
      <div className="pointer-events-none fixed inset-0 z-[61] flex items-center justify-center p-6">
        <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-zinc-100" title={image.caption ?? image.alt}>
              {image.caption ?? image.alt}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition hover:border-zinc-500"
            >
              Zamknij
            </button>
          </div>
          <div className="mt-4 flex items-center justify-center rounded-xl bg-zinc-950/60 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              className="max-h-[70vh] w-full max-w-full rounded-lg bg-white p-2 object-contain"
            />
          </div>
          <a
            href={image.downloadSrc ?? image.src}
            download={image.downloadFileName}
            className="mt-4 block rounded-lg border border-zinc-700 px-3 py-2 text-center text-sm text-zinc-200 transition hover:border-zinc-500"
          >
            Pobierz PNG
          </a>
        </div>
      </div>
    </>
  );
}
