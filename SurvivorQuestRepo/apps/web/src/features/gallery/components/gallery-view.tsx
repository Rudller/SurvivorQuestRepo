"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchGalleryPhotos, GalleryApiError, verifyGalleryPassword } from "../api/gallery-client";
import type { GalleryPhotosResponse } from "../types";
import { GalleryPasswordScreen } from "./gallery-password-screen";
import { GalleryPhotoGrid } from "./gallery-photo-grid";

type GalleryViewProps = {
  realizationId: string;
};

function accessTokenStorageKey(realizationId: string) {
  return `sq.gallery.access-token.${realizationId}`;
}

export function GalleryView({ realizationId }: GalleryViewProps) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [galleryData, setGalleryData] = useState<GalleryPhotosResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem(accessTokenStorageKey(realizationId));
    setAccessToken(storedToken);
    setIsHydrated(true);
  }, [realizationId]);

  const loadPhotos = useCallback(
    async (token: string) => {
      setIsLoadingPhotos(true);
      setLoadError(null);
      try {
        const data = await fetchGalleryPhotos(realizationId, token);
        setGalleryData(data);
      } catch (error) {
        if (error instanceof GalleryApiError && error.status === 401) {
          window.sessionStorage.removeItem(accessTokenStorageKey(realizationId));
          setAccessToken(null);
          setGalleryData(null);
        } else {
          setLoadError(error instanceof Error ? error.message : "Nie udało się pobrać galerii.");
        }
      } finally {
        setIsLoadingPhotos(false);
      }
    },
    [realizationId],
  );

  useEffect(() => {
    if (isHydrated && accessToken) {
      void loadPhotos(accessToken);
    }
  }, [isHydrated, accessToken, loadPhotos]);

  const handleVerify = useCallback(
    async (code: string) => {
      setIsVerifying(true);
      setVerifyError(null);
      try {
        const token = await verifyGalleryPassword(realizationId, code);
        window.sessionStorage.setItem(accessTokenStorageKey(realizationId), token);
        setAccessToken(token);
      } catch (error) {
        setVerifyError(error instanceof Error ? error.message : "Nie udało się zweryfikować kodu.");
      } finally {
        setIsVerifying(false);
      }
    },
    [realizationId],
  );

  if (!isHydrated) {
    return null;
  }

  if (!accessToken) {
    return <GalleryPasswordScreen onSubmit={handleVerify} isVerifying={isVerifying} errorMessage={verifyError} />;
  }

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-alert">{loadError}</p>
        <button
          type="button"
          onClick={() => void loadPhotos(accessToken)}
          className="rounded-xl border border-line bg-graphite/80 px-4 py-2.5 text-sm font-medium text-ivory transition hover:border-amber/60 hover:text-amber"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  if (isLoadingPhotos || !galleryData) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-ivory-muted">Ładowanie galerii...</p>
      </div>
    );
  }

  return <GalleryPhotoGrid realization={galleryData.realization} photos={galleryData.photos} />;
}
