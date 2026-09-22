/**
 * Wiersz tabeli wyników drużyn.
 *
 * Wspólny dla obu trybów rozgrywki: ekspedycja pokazuje go na pasku u góry i
 * na ekranie końcowym, Ryzykanci na swoim podsumowaniu. Mieszkał w
 * expedition-stage/model/types.ts, przez co cztery pliki risk-quiz musiały
 * sięgać po typ do cudzego features — granica typów przebiegała przez środek
 * jednego z trybów zamiast przez warstwę wspólną.
 */
export type ExpeditionLeaderboardEntry = {
  position: number;
  teamId: string;
  slotNumber: number;
  name: string;
  color: string | null;
  badgeKey: string | null;
  badgeImageUrl: string | null;
  points: number;
  progressDone: number;
  progressTotal: number;
  progressPercent: number;
};
