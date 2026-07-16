import { buildBackendApiUrl } from "@/lib/backend-api";
import type { GalleryPhotosResponse } from "../types";

export class GalleryApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GalleryApiError";
  }
}

function verifyErrorMessage(status: number) {
  if (status === 404) {
    return "Nie znaleziono galerii dla tego linku.";
  }
  if (status === 401 || status === 400) {
    return "Nieprawidłowy kod realizacji.";
  }
  return "Nie udało się zweryfikować kodu. Spróbuj ponownie.";
}

function loadErrorMessage(status: number) {
  if (status === 401) {
    return "Sesja galerii wygasła. Podaj kod ponownie.";
  }
  if (status === 404) {
    return "Nie znaleziono galerii dla tego linku.";
  }
  return "Nie udało się pobrać galerii. Spróbuj ponownie.";
}

export async function verifyGalleryPassword(realizationId: string, code: string) {
  const response = await fetch(buildBackendApiUrl(`/gallery/${realizationId}/verify`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    throw new GalleryApiError(verifyErrorMessage(response.status), response.status);
  }

  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
}

export async function fetchGalleryPhotos(realizationId: string, accessToken: string) {
  const response = await fetch(
    buildBackendApiUrl(`/gallery/${realizationId}/photos?token=${encodeURIComponent(accessToken)}`),
  );

  if (!response.ok) {
    throw new GalleryApiError(loadErrorMessage(response.status), response.status);
  }

  return (await response.json()) as GalleryPhotosResponse;
}
