export const DEFAULT_STATION_DESCRIPTION =
  'Opis stanowiska będzie dostępny po rozpoczęciu zadania.';

export function buildStationFallbackImage(seed: string) {
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;
}
