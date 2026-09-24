/**
 * Od ilu sekund startuje licznik karty. Serwer liczy czas od pierwszego
 * wylosowania (ponowny skan go nie odnawia) i odsyła `remainingSeconds`.
 * Brak pola = starszy backend, wtedy pełny limit stacji. null = bez limitu.
 */
export function resolveRiskTaskStartSeconds(draw: {
  remainingSeconds?: number | null;
  station: { timeLimitSeconds?: number | null };
}): number | null {
  if (typeof draw.remainingSeconds === "number") {
    return Math.max(0, draw.remainingSeconds);
  }
  if (draw.remainingSeconds === null) {
    return null;
  }
  const timeLimitSeconds = draw.station.timeLimitSeconds ?? 0;
  return timeLimitSeconds > 0 ? timeLimitSeconds : null;
}

/**
 * Czy karta ma właśnie przepaść po czasie. Tylko raz na kartę i tylko wtedy,
 * gdy drużyna niczego jeszcze nie wysłała — zdjęcie czy odpowiedź opisowa
 * czekające na Game Mastera nie przepadają, bo już zostały oddane.
 * `timeoutsDisabled` to przełącznik z menu testowego.
 */
export function shouldExpireRiskTask(input: {
  remainingSeconds: number | null;
  hasActiveDraw: boolean;
  hasAnswerResult: boolean;
  alreadySubmitted: boolean;
  timeoutsDisabled: boolean;
}): boolean {
  return (
    input.remainingSeconds === 0 &&
    input.hasActiveDraw &&
    !input.hasAnswerResult &&
    !input.alreadySubmitted &&
    !input.timeoutsDisabled
  );
}
