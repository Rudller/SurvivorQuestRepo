/**
 * Ile sekund zostało drużynie na zadanie z karty.
 *
 * Liczone od chwili wylosowania (RiskOpenDraw.createdAt), a nie od momentu,
 * w którym tablet pokazał kartę: zamknięcie karty i ponowny skan zwraca to
 * samo zadanie, więc gdyby licznik startował od nowa, drużyna mogłaby tak
 * dokupować czasu. `null` = stacja nie ma limitu. Brak `openedAt` = karta
 * dopiero wylosowana, czyli pełny czas.
 */
export function resolveRiskRemainingSeconds(
  timeLimitSeconds: number,
  openedAt: Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!Number.isFinite(timeLimitSeconds) || timeLimitSeconds <= 0) {
    return null;
  }
  if (!openedAt) {
    return timeLimitSeconds;
  }
  const elapsedSeconds = Math.floor(
    (now.getTime() - openedAt.getTime()) / 1000,
  );
  return Math.max(
    0,
    Math.min(timeLimitSeconds, timeLimitSeconds - elapsedSeconds),
  );
}
