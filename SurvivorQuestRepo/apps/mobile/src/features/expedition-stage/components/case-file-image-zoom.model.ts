export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
export const DOUBLE_TAP_ZOOM = 2.5;

type Size = { width: number; height: number };

export function clampZoom(scale: number) {
  return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
}

/**
 * Rozmiar zdjęcia wpisanego w okno trybem `contain`. Bez znanych proporcji
 * (zdjęcie jeszcze się nie wczytało) zakładamy, że wypełnia całe okno.
 */
export function fitContain(image: Size | null, viewport: Size): Size {
  if (!image || image.width <= 0 || image.height <= 0) {
    return viewport;
  }
  const ratio = Math.min(viewport.width / image.width, viewport.height / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
}

/**
 * Przesunięcie powiększonego zdjęcia ograniczone tak, by jego krawędź nie
 * odjechała do środka okna. Skala działa wokół środka, więc na każdej osi luz
 * to (s · wymiar zdjęcia − wymiar okna) / 2 w obie strony — a gdy powiększone
 * zdjęcie wciąż mieści się w oknie (np. poziome zdjęcie w pionie), luzu nie ma.
 */
export function clampPan(pan: { x: number; y: number }, scale: number, content: Size, viewport: Size) {
  const maxX = Math.max(0, (scale * content.width - viewport.width) / 2);
  const maxY = Math.max(0, (scale * content.height - viewport.height) / 2);
  // `|| 0` zamienia -0 na 0.
  return {
    x: Math.min(Math.max(pan.x, -maxX), maxX) || 0,
    y: Math.min(Math.max(pan.y, -maxY), maxY) || 0,
  };
}
