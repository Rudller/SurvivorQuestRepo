import { useEffect } from "react";

import { LAMP_COMMANDS, type LampResult, lampColorCommand, reconnectSavedLamp, sendLampCommand } from "./risk-lamp";

// Lampa pokazuje stan stołu: fala w kolorze drużyny, gdy drużyna czeka na
// kartę, i mignięcia po wyniku. Ogień karty wysyła openDrawnCard — od razu
// przy losowaniu, nie po animacji wejścia karty.
export function useRiskLampSync({
  hasCard,
  cardId,
  result,
  teamColorHex,
}: {
  hasCard: boolean;
  cardId: string | null;
  result: LampResult | null;
  teamColorHex: string | null;
}) {
  useEffect(() => {
    void reconnectSavedLamp();
  }, []);

  useEffect(() => {
    if (!hasCard) {
      sendLampCommand(teamColorHex ? lampColorCommand(teamColorHex) : LAMP_COMMANDS.idle);
    }
  }, [hasCard, teamColorHex]);

  // Raz na wynik karty — cardId w zależnościach, żeby dwie dobre odpowiedzi
  // z rzędu mignęły dwa razy.
  useEffect(() => {
    if (result) {
      sendLampCommand(LAMP_COMMANDS[result], {
        oneShot: true,
        then: teamColorHex ? lampColorCommand(teamColorHex) : LAMP_COMMANDS.idle,
      });
    }
    // teamColorHex celowo poza zależnościami: zmiana koloru nie powtarza mignięć.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, cardId]);
}
