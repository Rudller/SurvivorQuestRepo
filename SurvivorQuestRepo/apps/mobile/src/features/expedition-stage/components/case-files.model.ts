import type { ExpeditionCaseFile, ExpeditionTask } from "../model/types";

/**
 * Czyste reguły akt sprawy, wyjęte z komponentu, żeby dało się je przypiąć
 * testem bez renderowania modala.
 */

/**
 * Kolejność w teczce ustala admin, serwer wysyła ją w `order`.
 *
 * Remis rozstrzygany identyfikatorem, nie kolejnością w tablicy: bez tego dwa
 * dowody o tym samym `order` potrafiłyby zamieniać się miejscami między
 * kolejnymi odpytaniami stanu sesji i teczka „mrugałaby" w trakcie gry.
 */
export function sortCaseFiles(caseFiles: ExpeditionCaseFile[]): ExpeditionCaseFile[] {
  return [...caseFiles].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export function countUnlockedCaseFiles(caseFiles: ExpeditionCaseFile[]): number {
  return caseFiles.filter((caseFile) => !caseFile.locked).length;
}

/**
 * Numer stanowiska w numeracji TEJ drużyny.
 *
 * Serwer wysyła przy zablokowanym dowodzie samo `unlockStationId`, bo numeracja
 * bywa rotowana per drużyna (`teamStationNumberingEnabled`). Mapowanie musi więc
 * powstać na urządzeniu, z `tasks`, które i tak są w stanie sesji.
 */
export function resolveUnlockStationNumber(
  caseFile: ExpeditionCaseFile,
  tasks: ExpeditionTask[],
): number | null {
  if (!caseFile.unlockStationId) {
    return null;
  }

  const task = tasks.find((item) => item.stationId === caseFile.unlockStationId);

  return task?.stationNumber ?? null;
}

/** Jaka część odstępu między kartami wystarczy, żeby spokojny swipe zmienił kartę. */
export const SWIPE_DISTANCE_RATIO = 0.15;
/** Prędkość (px/ms), od której krótki, szybki ruch też liczy się jako swipe. */
export const SWIPE_FLICK_VELOCITY = 0.3;
const SWIPE_FLICK_MIN_DISTANCE = 8;

/**
 * Karta, na którą ma przeskoczyć karuzela po puszczeniu palca.
 *
 * Natywny snap Androida liczy się z prędkością w chwili podniesienia palca: gdy
 * palec zwolni przed puszczeniem, prędkość jest zerowa i karta wraca, o ile nie
 * przeciągnięto jej za połowę. Karta zajmuje ~85% szerokości okna, więc spokojny
 * swipe „raz działał, raz nie”. Tu o zmianie decyduje kierunek i niewielki
 * dystans, a szybki ruch wystarcza nawet krótki. Zawsze najwyżej o jedną kartę.
 */
export function resolveSwipeTarget({
  index,
  dx,
  vx,
  interval,
  count,
}: {
  index: number;
  dx: number;
  vx: number;
  interval: number;
  count: number;
}): number {
  const farEnough = Math.abs(dx) > interval * SWIPE_DISTANCE_RATIO;
  const flicked = Math.abs(vx) > SWIPE_FLICK_VELOCITY && Math.abs(dx) > SWIPE_FLICK_MIN_DISTANCE;
  if (!farEnough && !flicked) {
    return index;
  }
  const next = dx < 0 ? index + 1 : index - 1;
  return Math.min(Math.max(next, 0), Math.max(count - 1, 0));
}
