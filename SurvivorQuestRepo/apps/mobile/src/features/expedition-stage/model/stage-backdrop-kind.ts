/**
 * Co leży pod rozgrywką: mapa, grafika wgrana przez admina, warstwa
 * dekoracyjna, czy jeszcze ładowanie.
 *
 * Wyciągnięte z ciała expedition-stage-screen.tsx, bo tam był to zagnieżdżony
 * operator warunkowy w pliku na tysiąc osiemset linii — nie do przeczytania i
 * nie do przetestowania bez bootowania całego ekranu. Tutaj jest tabelką na
 * cztery wiersze i ma własny test.
 */
export type StageBackdropKind = "loading" | "map" | "image" | "backdrop";

export type StageBackdropInput = {
  isLoading: boolean;
  hideMap: boolean;
  mapImageUrl?: string;
};

export function resolveStageBackdropKind({
  isLoading,
  hideMap,
  mapImageUrl,
}: StageBackdropInput): StageBackdropKind {
  if (isLoading) {
    return "loading";
  }

  if (!hideMap) {
    return "map";
  }

  // Wgrana grafika jest TREŚCIĄ autorstwa admina, warstwa dekoracyjna jest
  // domyślną odpowiedzią na jej brak — więc grafika zawsze wygrywa. Malowanie
  // tła pod nią nic by nie dało, bo `cover` i tak zasłania wszystko.
  //
  // Pusty łańcuch traktowany jak brak: normalizacja odpowiedzi w
  // mobile-session.api.ts robi `asString(...) || undefined`, ale realizacje
  // zapisane starszą ścieżką potrafią przynieść same spacje.
  return mapImageUrl?.trim() ? "image" : "backdrop";
}
